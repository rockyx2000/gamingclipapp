"use client";

// クリップのアップロードフォーム
// - 選択した動画のメタデータから長さを読み取り、60 秒以内かをブラウザ側で検証する
// - 1 秒目のフレームを canvas で JPEG 化してサムネイルとして一緒に送る
// - XMLHttpRequest で送信し、アップロード進捗を表示する（fetch は進捗を取れない）

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useAuth } from "@/components/AuthProvider";
import { MAX_CLIP_DURATION_SEC, type Game } from "@/lib/types";
import { formatDuration } from "@/lib/format";

const ACCEPTED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const THUMBNAIL_WIDTH = 640;

interface ProbeResult {
  durationSec: number;
  thumbnail: Blob | null;
}

// 動画ファイルから長さとサムネイルを取り出す
function probeVideo(file: File): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
    const finish = (thumbnail: Blob | null) => {
      const durationSec = Math.round(video.duration);
      cleanup();
      resolve({ durationSec, thumbnail });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("動画を読み込めませんでした"));
    };
    video.onloadedmetadata = () => {
      // 1 秒目（短い動画なら中間）へシークしてフレームを取り出す
      video.currentTime = Math.min(1, video.duration / 2);
    };
    video.onseeked = () => {
      try {
        const scale = Math.min(1, THUMBNAIL_WIDTH / video.videoWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => finish(blob), "image/jpeg", 0.85);
      } catch {
        finish(null);
      }
    };
    video.src = url;
  });
}

// XHR でアップロードし、進捗をコールバックする
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
  const [gameId, setGameId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => setGames(data.games))
      .catch(() => setGames([]));
  }, []);

  // サムネイルのプレビュー URL（Object URL）を差し替え・アンマウント時に解放する
  const previewUrlRef = useRef<string | null>(null);
  const replacePreview = (blob: Blob | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = blob ? URL.createObjectURL(blob) : null;
    setPreviewUrl(previewUrlRef.current);
  };
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleFileChange = async (selected: File | undefined) => {
    setFile(selected ?? null);
    setProbe(null);
    setFileError(null);
    replacePreview(null);
    if (!selected) return;

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setFileError("対応していない動画形式です（mp4 / webm / mov）");
      return;
    }
    try {
      const result = await probeVideo(selected);
      setProbe(result);
      replacePreview(result.thumbnail);
      if (result.durationSec > MAX_CLIP_DURATION_SEC) {
        setFileError(
          `動画の長さは${MAX_CLIP_DURATION_SEC}秒以内にしてください（選択したファイル: ${formatDuration(result.durationSec)}）`,
        );
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "動画を読み込めませんでした");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !probe) return;
    setProgress(0);
    setError(null);

    const form = new FormData();
    form.append("video", file);
    if (probe.thumbnail) {
      form.append("thumbnail", probe.thumbnail, "thumb.jpg");
    }
    form.append("title", title);
    form.append("description", description);
    form.append("gameId", gameId);
    form.append("durationSec", String(probe.durationSec));

    try {
      const { status, body } = await uploadClip(form, setProgress);
      if (status !== 201 || !body.clip) {
        throw new Error(body.error ?? "アップロードに失敗しました");
      }
      router.push(`/clips/${body.clip.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setProgress(null);
    }
  };

  if (!loading && !user) {
    return (
      <Alert severity="info">
        クリップをアップロードするにはログインが必要です。ヘッダーの「ログイン」から進んでください。
      </Alert>
    );
  }

  const uploading = progress !== null;
  const fileLabel = file
    ? probe
      ? `${file.name}（${formatDuration(probe.durationSec)}）`
      : `${file.name}（読み込み中...）`
    : `動画ファイルを選択（最大${MAX_CLIP_DURATION_SEC}秒）`;
  const canSubmit =
    !uploading && !!file && !!probe && !fileError && !!title && !!gameId;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 }, maxWidth: 640, mx: "auto" }}>
      <Typography variant="h2" sx={{ mb: 1 }}>
        クリップをアップロード
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        1分以内のゲームクリップを投稿できます。対応形式は mp4 / webm / mov です。
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}

          <Button
            component="label"
            variant="outlined"
            color={fileError ? "error" : "primary"}
            startIcon={<CloudUploadIcon />}
            disabled={uploading}
            sx={{ py: 2, borderStyle: "dashed" }}
          >
            {fileLabel}
            <input
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              hidden
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
          </Button>
          {fileError && <Alert severity="warning">{fileError}</Alert>}

          {previewUrl && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                サムネイル（動画の1秒目から自動生成）
              </Typography>
              <Box
                component="img"
                src={previewUrl}
                alt="サムネイルのプレビュー"
                sx={{
                  display: "block",
                  width: "100%",
                  maxWidth: 320,
                  aspectRatio: "16 / 9",
                  objectFit: "cover",
                  borderRadius: 1,
                  mt: 0.5,
                }}
              />
            </Box>
          )}

          <TextField
            required
            label="タイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
          />
          <TextField
            multiline
            minRows={3}
            label="説明"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={uploading}
          />
          <TextField
            select
            required
            label="ゲーム"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            disabled={uploading}
          >
            {games.map((game) => (
              <MenuItem key={game.id} value={game.id}>
                {game.name}
              </MenuItem>
            ))}
          </TextField>

          {uploading && (
            <Box>
              <LinearProgress
                variant={progress < 100 ? "determinate" : "indeterminate"}
                value={progress}
              />
              <Typography variant="caption" color="text.secondary">
                {progress < 100 ? `アップロード中... ${progress}%` : "保存中..."}
              </Typography>
            </Box>
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={!canSubmit}
          >
            アップロード
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
