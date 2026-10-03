"use client";

// プレイリストの詳細。持ち主には編集・削除・並べ替え・クリップの削除を出す。
// 操作のたびに API の返すプレイリストで表示を差し替える。

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PublicIcon from "@mui/icons-material/Public";
import ShareIcon from "@mui/icons-material/Share";
import type { PlaylistWithClips } from "@/lib/types";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";
import { displaySx } from "@/theme";
import { ClipRow } from "./ClipRow";
import { PlaylistFormDialog } from "./PlaylistFormDialog";

interface Props {
  initial: PlaylistWithClips;
  isOwner: boolean;
}

export function PlaylistDetail({ initial, isOwner }: Props) {
  const router = useRouter();
  const [playlist, setPlaylist] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const totalSec = playlist.clips.reduce((sum, c) => sum + c.durationSec, 0);
  const query = `?list=${playlist.id}`;

  // 失敗したらメッセージを出し、成功したら返ってきたプレイリストで表示を更新する
  const call = async (url: string, init: RequestInit) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, init);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "更新に失敗しました");
      setPlaylist(data.playlist);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, delta: number) => {
    const ids = playlist.clips.map((c) => c.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    return call(`/api/playlists/${playlist.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clipIds: ids }),
    });
  };

  const remove = (clipId: string) =>
    call(`/api/playlists/${playlist.id}/clips/${clipId}`, { method: "DELETE" });

  const handleDelete = async () => {
    setBusy(true);
    const res = await fetch(`/api/playlists/${playlist.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/playlists");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "削除に失敗しました");
      setConfirmDelete(false);
      setBusy(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/playlists/${playlist.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: playlist.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast("リンクをコピーしました");
      }
    } catch {
      // 共有のキャンセルなど
    }
  };

  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 2, sm: 3 }}
        sx={{ alignItems: { sm: "flex-end" }, mb: 3 }}
      >
        <Box
          sx={{
            width: { xs: "100%", sm: 280 },
            flexShrink: 0,
            aspectRatio: "16 / 9",
            borderRadius: 1,
            bgcolor: "#000",
            backgroundImage: playlist.clips[0]
              ? `url(${playlist.clips[0].thumbnailUrl})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="h1" sx={{ wordBreak: "break-word" }}>
            {playlist.title}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 1 }}>
            <Avatar src={playlist.owner.avatarUrl} sx={{ width: 24, height: 24 }} />
            <Typography variant="body2">{playlist.owner.displayName}</Typography>
            {playlist.visibility === "private" ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}>
                <LockOutlinedIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">非公開</Typography>
              </Stack>
            ) : (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}>
                <PublicIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">公開</Typography>
              </Stack>
            )}
          </Stack>
          <Stack direction="row" spacing={2.5} sx={{ mt: 1.5, alignItems: "baseline" }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "baseline" }}>
              <Typography component="span" sx={{ ...displaySx, fontSize: 28 }}>
                {playlist.clips.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                クリップ
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "baseline" }}>
              <Typography component="span" sx={{ ...displaySx, fontSize: 28 }}>
                {formatDuration(totalSec)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                合計
              </Typography>
            </Stack>
          </Stack>
          {playlist.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1.5, whiteSpace: "pre-wrap" }}
            >
              {playlist.description}
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", rowGap: 1 }}>
            {playlist.clips[0] && (
              <Button
                component={Link}
                href={`/clips/${playlist.clips[0].id}${query}`}
                variant="contained"
                startIcon={<PlayArrowIcon />}
              >
                すべて再生
              </Button>
            )}
            {playlist.visibility === "public" && (
              <Button variant="outlined" startIcon={<ShareIcon />} onClick={handleShare}>
                共有
              </Button>
            )}
            {isOwner && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => setEditing(true)}
                >
                  編集
                </Button>
                <Button color="error" onClick={() => setConfirmDelete(true)}>
                  削除
                </Button>
              </>
            )}
          </Stack>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {playlist.clips.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4 }}>
          {isOwner
            ? "まだクリップがありません。視聴ページの「保存」から追加できます。"
            : "このプレイリストにはまだクリップがありません。"}
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {playlist.clips.map((clip, i) => (
            <ClipRow
              key={clip.id}
              clip={clip}
              rank={i + 1}
              query={query}
              meta={
                <>
                  {formatViews(clip.views)}
                  {"　"}
                  {timeAgo(clip.createdAt)}
                </>
              }
              actions={
                isOwner && (
                  <Stack direction={{ xs: "column", sm: "row" }}>
                    <Tooltip title="上へ">
                      <span>
                        <IconButton
                          size="small"
                          disabled={busy || i === 0}
                          onClick={() => move(i, -1)}
                          aria-label="上へ移動"
                        >
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="下へ">
                      <span>
                        <IconButton
                          size="small"
                          disabled={busy || i === playlist.clips.length - 1}
                          onClick={() => move(i, 1)}
                          aria-label="下へ移動"
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="プレイリストから削除">
                      <span>
                        <IconButton
                          size="small"
                          disabled={busy}
                          onClick={() => remove(clip.id)}
                          aria-label="プレイリストから削除"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                )
              }
            />
          ))}
        </Stack>
      )}

      <PlaylistFormDialog
        open={editing}
        dialogTitle="プレイリストを編集"
        submitLabel="保存"
        initial={{
          title: playlist.title,
          description: playlist.description,
          visibility: playlist.visibility,
        }}
        onClose={() => setEditing(false)}
        onSubmit={async (value) => {
          const res = await fetch(`/api/playlists/${playlist.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(value),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "保存に失敗しました");
          setPlaylist(data.playlist);
          setEditing(false);
        }}
      />

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>プレイリストを削除しますか？</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            「{playlist.title}」を削除します。入っているクリップ自体は消えません。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDelete(false)} disabled={busy}>
            キャンセル
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={busy}>
            削除
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast !== null}
        autoHideDuration={2000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </>
  );
}
