"use client";

// クリップの投稿画面。1 つの URL の中でフェーズを切り替える（画面遷移しない）。
//   1. 選択 : 動画をドロップ / 選択する
//   2. 編集 : 投稿する範囲・フィルター・テキストを決める
//   3. 情報 : 書き出した結果を見ながらタイトルなどを入力して投稿する
// 遷移でファイルや編集状態を失わないよう、状態はこのコンポーネントが持ち続ける。
// 書き出しは「編集 → 情報」へ進むときに 1 度だけ行い、結果の Blob を保持する。

import { useEffect, useRef, useState } from "react";
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
import { DetailsStep, type ClipDetails } from "@/components/upload/DetailsStep";
import { MAX_CLIP_DURATION_SEC, type Game } from "@/lib/types";
import {
  createDefaultEdit,
  hasEffects,
  type ClipEdit,
} from "@/lib/video-edit";
import { captureThumbnail, readVideoMeta, type VideoMeta } from "@/lib/video-probe";
import { canBakeFilters, canTrimInBrowser, exportClip } from "@/lib/video-trim";

const ACCEPTED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const STEPS = ["動画を選ぶ", "編集する", "投稿する"];

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
  thumbnail: Blob | null;
  thumbnailUrl: string | null;
  lengthSec: number;
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
  const [details, setDetails] = useState<ClipDetails>({
    title: "",
    description: "",
    gameId: "",
  });
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Object URL は state に持ち、差し替えとアンマウントのときだけ解放する
  // （effect のクリーンアップで解放すると開発時の再マウントで URL が失効する）
  const sourceUrlRef = useRef<string | null>(null);
  const exportedUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      exportedUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => setGames(data.games))
      .catch(() => setGames([]));
  }, []);

  const releaseExported = () => {
    exportedUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    exportedUrlsRef.current = [];
    setExported(null);
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

      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      const previewUrl = URL.createObjectURL(file);
      sourceUrlRef.current = previewUrl;
      releaseExported();

      setSource({ file, meta, previewUrl });
      setEdit(createDefaultEdit(meta.durationSec, MAX_CLIP_DURATION_SEC));
      setPhase({ kind: "idle" });
      setStep(1);
    } catch (err) {
      setPhase({ kind: "idle" });
      setFileError(err instanceof Error ? err.message : "動画を読み込めませんでした");
    }
  };

  // 編集 → 情報。ここで 1 度だけ書き出す
  const handleExport = async () => {
    if (!source || !edit) return;
    setError(null);
    setPhase({ kind: "exporting", progress: 0 });
    try {
      const blob = await exportClip(source.file, edit, source.meta, (p) =>
        setPhase({ kind: "exporting", progress: Math.round(p * 100) }),
      );
      const thumbnail = await captureThumbnail(
        blob,
        Math.min(1, edit.trim.length / 2),
      ).catch(() => null);

      releaseExported();
      const previewUrl = URL.createObjectURL(blob);
      const thumbnailUrl = thumbnail ? URL.createObjectURL(thumbnail) : null;
      exportedUrlsRef.current = thumbnailUrl ? [previewUrl, thumbnailUrl] : [previewUrl];

      setExported({
        blob,
        previewUrl,
        thumbnail,
        thumbnailUrl,
        lengthSec: edit.trim.length,
      });
      setPhase({ kind: "idle" });
      setStep(2);
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
      if (exported.thumbnail) {
        form.append("thumbnail", exported.thumbnail, "thumb.jpg");
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
          />
        </>
      )}

      {step === 2 && exported && (
        <DetailsStep
          previewUrl={exported.previewUrl}
          thumbnailUrl={exported.thumbnailUrl}
          lengthSec={exported.lengthSec}
          sizeBytes={exported.blob.size}
          games={games}
          value={details}
          onChange={setDetails}
          disabled={busy}
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
              disabled={busy || !details.title || !details.gameId}
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
