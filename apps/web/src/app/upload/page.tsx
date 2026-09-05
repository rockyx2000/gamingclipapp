"use client";

// クリップの投稿画面。1 つの URL の中でフェーズを切り替える（画面遷移しない）。
//   1. 選択 : 動画をドロップ / 選択する
//   2. 編集 : 投稿する範囲・フィルター・テキスト・BGM を決める
//   3. 情報 : 書き出した結果を見ながらサムネイルとタイトルを決めて投稿する
// 遷移でファイルや編集状態を失わないよう、状態はこのコンポーネントが持ち続ける。
// 書き出しは「編集 → 情報」へ進むときに 1 度だけ行い、結果の Blob を保持する。
// Object URL もここで管理する（EditStep は行き来のたびに作り直されるため）。

import { useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useAuth } from "@/components/AuthProvider";
import { FileDropzone } from "@/components/upload/FileDropzone";
import { EditStep } from "@/components/upload/EditStep";
import {
  DetailsStep,
  THUMBNAIL_TYPES,
  type ClipDetails,
  type ThumbnailKind,
} from "@/components/upload/DetailsStep";
import { MAX_CLIP_DURATION_SEC, type Game } from "@/lib/types";
import {
  clampBgm,
  createBgm,
  createDefaultEdit,
  hasEffects,
  type ClipEdit,
} from "@/lib/video-edit";
import { isAudioFile, MAX_BGM_BYTES, readAudioDuration } from "@/lib/audio-mix";
import { captureThumbnail, readVideoMeta, type VideoMeta } from "@/lib/video-probe";
import { canAddBgm, canBakeFilters, canTrimInBrowser, exportClip } from "@/lib/video-trim";

const ACCEPTED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const STEPS = ["動画を選ぶ", "編集する", "投稿する"];

/** アップロードできるサムネイル画像の上限（サーバー側の MAX_THUMBNAIL_MB と合わせる） */
const MAX_THUMBNAIL_BYTES = 10 * 1024 * 1024;

type Phase =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "exporting"; progress: number }
  | { kind: "uploading"; progress: number }
  | { kind: "saving" };

interface SourceVideo {
  file: File;
  meta: VideoMeta;
  previewUrl: string;
}

interface ExportedClip {
  blob: Blob;
  previewUrl: string;
  lengthSec: number;
}

interface Thumbnail {
  blob: Blob;
  url: string;
  kind: ThumbnailKind;
  /** 動画から切り出した場合の位置（秒） */
  time: number;
  filename: string;
}

// XHR でアップロードし、進捗をコールバックする（fetch は進捗を取れない）
function uploadClip(
  form: FormData,
  onProgress: (percent: number) => void,
): Promise<{ status: number; body: { clip?: { id: string }; error?: string } }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/clips");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        resolve({ status: xhr.status, body: JSON.parse(xhr.responseText) });
      } catch {
        resolve({ status: xhr.status, body: {} });
      }
    };
    xhr.onerror = () => reject(new Error("通信エラーが発生しました"));
    xhr.send(form);
  });
}

export default function UploadPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<SourceVideo | null>(null);
  const [edit, setEdit] = useState<ClipEdit | null>(null);
  const [exported, setExported] = useState<ExportedClip | null>(null);
  const [thumbnail, setThumbnail] = useState<Thumbnail | null>(null);
  const [thumbnailBusy, setThumbnailBusy] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [bgmUrl, setBgmUrl] = useState<string | null>(null);
  const [bgmError, setBgmError] = useState<string | null>(null);
  const [audioSupported, setAudioSupported] = useState(true);
  const [details, setDetails] = useState<ClipDetails>({
    title: "",
    description: "",
    gameId: "",
  });
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Object URL は ref に控え、差し替えとアンマウントのときだけ解放する
  // （effect のクリーンアップで解放すると開発時の再マウントで URL が失効する）
  const sourceUrlRef = useRef<string | null>(null);
  const exportedUrlRef = useRef<string | null>(null);
  const thumbUrlRef = useRef<string | null>(null);
  const bgmUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const urls = [sourceUrlRef, exportedUrlRef, thumbUrlRef, bgmUrlRef];
    return () => {
      urls.forEach((ref) => {
        if (ref.current) URL.revokeObjectURL(ref.current);
      });
    };
  }, []);

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => setGames(data.games))
      .catch(() => setGames([]));
  }, []);

  // BGM を混ぜられるブラウザかを一度だけ調べる
  useEffect(() => {
    let alive = true;
    canAddBgm()
      .then((ok) => {
        if (alive) setAudioSupported(ok);
      })
      .catch(() => {
        if (alive) setAudioSupported(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  /** ref が持っている URL を新しいものに差し替える */
  const swapUrl = (ref: RefObject<string | null>, next: string | null) => {
    if (ref.current) URL.revokeObjectURL(ref.current);
    ref.current = next;
    return next;
  };

  const releaseExported = () => {
    swapUrl(exportedUrlRef, null);
    swapUrl(thumbUrlRef, null);
    setExported(null);
    setThumbnail(null);
    setThumbnailError(null);
  };

  const handleFile = async (file: File) => {
    setFileError(null);
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError("対応していない動画形式です（mp4 / webm / mov）");
      return;
    }

    setPhase({ kind: "reading" });
    try {
      const meta = await readVideoMeta(file);
      if (!Number.isFinite(meta.durationSec) || meta.durationSec <= 0) {
        throw new Error("動画の長さを読み取れませんでした");
      }
      if (meta.durationSec > MAX_CLIP_DURATION_SEC && !(await canTrimInBrowser())) {
        throw new Error(
          "このブラウザでは動画の切り出しができません。Chrome / Edge / Safari の最新版をお使いください。",
        );
      }

      const previewUrl = swapUrl(sourceUrlRef, URL.createObjectURL(file))!;
      releaseExported();
      swapUrl(bgmUrlRef, null);
      setBgmUrl(null);
      setBgmError(null);

      setSource({ file, meta, previewUrl });
      setEdit(createDefaultEdit(meta.durationSec, MAX_CLIP_DURATION_SEC));
      setPhase({ kind: "idle" });
      setStep(1);
    } catch (err) {
      setPhase({ kind: "idle" });
      setFileError(err instanceof Error ? err.message : "動画を読み込めませんでした");
    }
  };

  const handlePickBgm = async (file: File) => {
    setBgmError(null);
    if (!edit) return;
    if (!isAudioFile(file)) {
      setBgmError("音声ファイルを選んでください（mp3 / m4a / wav / ogg など）");
      return;
    }
    if (file.size > MAX_BGM_BYTES) {
      setBgmError(`音声ファイルは${Math.floor(MAX_BGM_BYTES / 1024 / 1024)}MB以下にしてください`);
      return;
    }
    try {
      const durationSec = await readAudioDuration(file);
      const created = createBgm(file, durationSec, edit.trim.length);
      setBgmUrl(swapUrl(bgmUrlRef, URL.createObjectURL(file)));
      setEdit({ ...edit, bgm: clampBgm(created, edit.trim.length) });
    } catch (err) {
      setBgmError(err instanceof Error ? err.message : "音声ファイルを読み込めませんでした");
    }
  };

  const handleRemoveBgm = () => {
    if (!edit) return;
    swapUrl(bgmUrlRef, null);
    setBgmUrl(null);
    setBgmError(null);
    setEdit({ ...edit, bgm: null });
  };

  /** 書き出した動画の time 秒のコマをサムネイルにする */
  const applyFrameThumbnail = async (blob: Blob, time: number) => {
    setThumbnailBusy(true);
    setThumbnailError(null);
    try {
      const frame = await captureThumbnail(blob, time);
      if (!frame) throw new Error("この位置のコマを取り出せませんでした");
      setThumbnail({
        blob: frame,
        url: swapUrl(thumbUrlRef, URL.createObjectURL(frame))!,
        kind: "frame",
        time,
        filename: "thumb.jpg",
      });
    } catch (err) {
      setThumbnailError(
        err instanceof Error ? err.message : "サムネイルを作れませんでした",
      );
    } finally {
      setThumbnailBusy(false);
    }
  };

  const handlePickImage = (file: File) => {
    setThumbnailError(null);
    if (!THUMBNAIL_TYPES.includes(file.type)) {
      setThumbnailError("JPEG / PNG / WebP の画像を選んでください");
      return;
    }
    if (file.size > MAX_THUMBNAIL_BYTES) {
      setThumbnailError(
        `画像は${Math.floor(MAX_THUMBNAIL_BYTES / 1024 / 1024)}MB以下にしてください`,
      );
      return;
    }
    setThumbnail({
      blob: file,
      url: swapUrl(thumbUrlRef, URL.createObjectURL(file))!,
      kind: "image",
      time: thumbnail?.time ?? 0,
      filename: file.name,
    });
  };

  // 編集 → 情報。ここで 1 度だけ書き出す
  const handleExport = async () => {
    if (!source || !edit) return;
    setError(null);

    // 切り出しや加工がある場合は再エンコードが要る。1 分以内の動画でも同じ
    const trimmed =
      edit.trim.start > 0.01 || edit.trim.length < source.meta.durationSec - 0.05;
    if ((trimmed || hasEffects(edit)) && !(await canTrimInBrowser())) {
      setError(
        "このブラウザでは動画を加工できません。Chrome / Edge / Safari の最新版をお使いください。",
      );
      return;
    }

    setPhase({ kind: "exporting", progress: 0 });
    try {
      const blob = await exportClip(source.file, edit, source.meta, (p) =>
        setPhase({ kind: "exporting", progress: Math.round(p * 100) }),
      );

      releaseExported();
      setExported({
        blob,
        previewUrl: swapUrl(exportedUrlRef, URL.createObjectURL(blob))!,
        lengthSec: edit.trim.length,
      });
      setPhase({ kind: "idle" });
      setStep(2);
      // 既定のサムネイルはクリップの序盤のコマ
      await applyFrameThumbnail(blob, Math.min(1, edit.trim.length / 2));
    } catch (err) {
      setPhase({ kind: "idle" });
      setError(err instanceof Error ? err.message : "書き出しに失敗しました");
    }
  };

  const handleSubmit = async () => {
    if (!exported) return;
    setError(null);
    try {
      const form = new FormData();
      form.append("video", exported.blob, "clip.mp4");
      if (thumbnail) {
        form.append("thumbnail", thumbnail.blob, thumbnail.filename);
      }
      form.append("title", details.title);
      form.append("description", details.description);
      form.append("gameId", details.gameId);
      form.append("durationSec", String(Math.round(exported.lengthSec)));

      setPhase({ kind: "uploading", progress: 0 });
      const { status, body } = await uploadClip(form, (p) => {
        setPhase(p < 100 ? { kind: "uploading", progress: p } : { kind: "saving" });
      });
      if (status !== 201 || !body.clip) {
        throw new Error(body.error ?? "アップロードに失敗しました");
      }
      router.push(`/clips/${body.clip.id}`);
      router.refresh();
    } catch (err) {
      setPhase({ kind: "idle" });
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  if (!loading && !user) {
    return (
      <Alert severity="info">
        クリップをアップロードするにはログインが必要です。ヘッダーの「ログイン」から進んでください。
      </Alert>
    );
  }

  const busy = phase.kind !== "idle";
  const phaseLabel =
    phase.kind === "exporting"
      ? `書き出し中... ${phase.progress}%`
      : phase.kind === "uploading"
        ? `アップロード中... ${phase.progress}%`
        : phase.kind === "saving"
          ? "保存中..."
          : phase.kind === "reading"
            ? "動画を読み込み中..."
            : "";
  const determinate = phase.kind === "exporting" || phase.kind === "uploading";

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        クリップを投稿
      </Typography>

      <Stepper activeStep={step} sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {step === 0 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            {fileError && <Alert severity="warning">{fileError}</Alert>}
            <FileDropzone
              accept={ACCEPTED_TYPES}
              busy={phase.kind === "reading"}
              onFile={handleFile}
            />
          </Stack>
        </Paper>
      )}

      {step === 1 && source && edit && (
        <>
          {source.meta.durationSec > MAX_CLIP_DURATION_SEC && (
            <Alert severity="info" sx={{ mb: 2 }}>
              この動画は1分を超えています。投稿する範囲を選んでください。
            </Alert>
          )}
          {hasEffects(edit) && !canBakeFilters() && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              このブラウザではフィルターを動画に焼き込めません。テキストは反映されますが、
              色の調整はプレビューのみになります。
            </Alert>
          )}
          <EditStep
            file={source.file}
            previewUrl={source.previewUrl}
            durationSec={source.meta.durationSec}
            aspect={source.meta.width / Math.max(1, source.meta.height)}
            maxSec={MAX_CLIP_DURATION_SEC}
            edit={edit}
            onChange={setEdit}
            bgmUrl={bgmUrl}
            bgmError={bgmError}
            audioSupported={audioSupported}
            onPickBgm={handlePickBgm}
            onRemoveBgm={handleRemoveBgm}
          />
        </>
      )}

      {step === 2 && exported && (
        <DetailsStep
          previewUrl={exported.previewUrl}
          lengthSec={exported.lengthSec}
          sizeBytes={exported.blob.size}
          games={games}
          value={details}
          onChange={setDetails}
          disabled={busy}
          thumbnailUrl={thumbnail?.url ?? null}
          thumbnailKind={thumbnail?.kind ?? "frame"}
          frameTime={thumbnail?.time ?? 0}
          thumbnailBusy={thumbnailBusy}
          thumbnailError={thumbnailError}
          onPickFrame={(time) => void applyFrameThumbnail(exported.blob, time)}
          onPickImage={handlePickImage}
        />
      )}

      {busy && (
        <Box sx={{ mt: 3 }}>
          <LinearProgress
            variant={determinate ? "determinate" : "indeterminate"}
            value={determinate ? phase.progress : undefined}
          />
          <Typography variant="caption" color="text.secondary">
            {phaseLabel}
          </Typography>
        </Box>
      )}

      {step > 0 && (
        <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: "flex-end" }}>
          <Button
            startIcon={<ArrowBackIcon />}
            disabled={busy}
            onClick={() => setStep(step - 1)}
            sx={{ mr: "auto" }}
          >
            戻る
          </Button>
          {step === 1 && (
            <Button variant="contained" size="large" disabled={busy} onClick={handleExport}>
              この範囲で進む
            </Button>
          )}
          {step === 2 && (
            <Button
              variant="contained"
              size="large"
              disabled={busy || thumbnailBusy || !details.title || !details.gameId}
              onClick={handleSubmit}
            >
              投稿する
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
}
