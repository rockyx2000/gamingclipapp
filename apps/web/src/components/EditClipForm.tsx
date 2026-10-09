"use client";

// 投稿したクリップの編集フォーム。投稿画面の「情報」フェーズ（DetailsStep）をそのまま使うので、
// タイトル・説明・ゲーム・サムネイル・映像の上のタグを、投稿時と同じ操作で直せる。
// 保存は、情報（PATCH）→ タグ（PUT）→ サムネイル（PUT）の順に送る。途中で失敗したら、そこで止めて知らせる。
// クリップの削除もここにある（確認ダイアログつき）。

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { captureThumbnail } from "@/lib/video-probe";
import {
  DetailsStep,
  MAX_THUMBNAIL_BYTES,
  THUMBNAIL_TYPES,
  type ClipDetails,
  type ThumbnailKind,
} from "./upload/DetailsStep";
import type { ClipTag, ClipWithGame, Game } from "@/lib/types";

interface NewThumbnail {
  blob: Blob;
  /** プレビュー用の blob URL */
  url: string;
  kind: ThumbnailKind;
  time: number;
  filename: string;
}

const tagsKey = (tags: ClipTag[]) =>
  JSON.stringify(tags.map((t) => [t.user.username, +t.x.toFixed(4), +t.y.toFixed(4)]));

export function EditClipForm({ clip, games }: { clip: ClipWithGame; games: Game[] }) {
  const router = useRouter();
  const initialTags = clip.tags ?? [];
  const [details, setDetails] = useState<ClipDetails>({
    title: clip.title,
    description: clip.description,
    gameId: clip.gameId,
    tags: initialTags,
  });
  const [thumbnail, setThumbnail] = useState<NewThumbnail | null>(null);
  const [thumbnailBusy, setThumbnailBusy] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // コマを選ぶときに、動画を 1 度だけ読み込んで使い回す
  const videoBlob = useRef<Blob | null>(null);
  const thumbUrl = useRef<string | null>(null);

  // プレビュー用の blob URL は、差し替えるときと閉じるときに解放する
  const swapThumbUrl = (next: string | null) => {
    if (thumbUrl.current) URL.revokeObjectURL(thumbUrl.current);
    thumbUrl.current = next;
    return next;
  };
  useEffect(
    () => () => {
      swapThumbUrl(null);
    },
    [],
  );

  const busy = saving || deleting;

  const handlePickFrame = async (time: number) => {
    setThumbnailBusy(true);
    setThumbnailError(null);
    try {
      if (!videoBlob.current) {
        const res = await fetch(clip.videoUrl);
        if (!res.ok) throw new Error("動画を読み込めませんでした");
        videoBlob.current = await res.blob();
      }
      const frame = await captureThumbnail(videoBlob.current, time);
      if (!frame) throw new Error("この位置のコマを取り出せませんでした");
      setThumbnail({
        blob: frame,
        url: swapThumbUrl(URL.createObjectURL(frame))!,
        kind: "frame",
        time,
        filename: "thumb.jpg",
      });
    } catch (err) {
      setThumbnailError(err instanceof Error ? err.message : "サムネイルを作れませんでした");
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
      setThumbnailError(`画像は${Math.floor(MAX_THUMBNAIL_BYTES / 1024 / 1024)}MB以下にしてください`);
      return;
    }
    setThumbnail({
      blob: file,
      url: swapThumbUrl(URL.createObjectURL(file))!,
      kind: "image",
      time: thumbnail?.time ?? 0,
      filename: file.name,
    });
  };

  /** api に送る。失敗したら、画面に出せる文言の Error を投げる */
  const send = async (url: string, init: RequestInit, fallback: string) => {
    const res = await fetch(url, init);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? fallback);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const base = `/api/clips/${clip.id}`;
    const json = { "Content-Type": "application/json" };
    try {
      await send(
        base,
        {
          method: "PATCH",
          headers: json,
          body: JSON.stringify({
            title: details.title,
            description: details.description,
            gameId: details.gameId,
          }),
        },
        "情報を保存できませんでした",
      );
      if (tagsKey(details.tags) !== tagsKey(initialTags)) {
        await send(
          `${base}/tags`,
          {
            method: "PUT",
            headers: json,
            body: JSON.stringify({
              tags: details.tags.map((t) => ({ username: t.user.username, x: t.x, y: t.y })),
            }),
          },
          "タグを保存できませんでした（タイトルなどは保存済みです）",
        );
      }
      if (thumbnail) {
        const form = new FormData();
        form.append("thumbnail", thumbnail.blob, thumbnail.filename);
        await send(
          `${base}/thumbnail`,
          { method: "PUT", body: form },
          "サムネイルを保存できませんでした（ほかの内容は保存済みです）",
        );
      }
      router.push(`/clips/${clip.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存できませんでした");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await send(`/api/clips/${clip.id}`, { method: "DELETE" }, "削除できませんでした");
      router.push("/");
      router.refresh();
    } catch (err) {
      setConfirmDelete(false);
      setError(err instanceof Error ? err.message : "削除できませんでした");
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 0.5 }}>
        クリップを編集
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        映像そのもの（編集で焼き込んだフィルターやテキストを含む）は、投稿後には変えられません。
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <DetailsStep
        previewUrl={clip.videoUrl}
        lengthSec={clip.durationSec}
        sizeBytes={clip.sizeBytes}
        games={games}
        value={details}
        onChange={setDetails}
        disabled={busy}
        thumbnailUrl={thumbnail?.url ?? clip.thumbnailUrl}
        thumbnailKind={thumbnail?.kind ?? "image"}
        frameTime={thumbnail?.time ?? 0}
        thumbnailBusy={thumbnailBusy}
        thumbnailError={thumbnailError}
        onPickFrame={(time) => void handlePickFrame(time)}
        onPickImage={handlePickImage}
      />

      <Stack
        direction="row"
        spacing={1.5}
        sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: "divider", alignItems: "center" }}
      >
        <Button color="error" onClick={() => setConfirmDelete(true)} disabled={busy}>
          クリップを削除
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={() => router.push(`/clips/${clip.id}`)} disabled={busy}>
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={busy || thumbnailBusy || !details.title.trim() || !details.gameId}
        >
          {saving ? "保存中…" : "保存"}
        </Button>
      </Stack>

      <Dialog open={confirmDelete} onClose={() => !deleting && setConfirmDelete(false)}>
        <DialogTitle>このクリップを削除しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            動画・サムネイルのほか、いいね・コメント・タグ・再生数、プレイリストへの登録も消えます。
            元に戻すことはできません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} disabled={deleting}>
            キャンセル
          </Button>
          <Button color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? "削除中…" : "削除する"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
