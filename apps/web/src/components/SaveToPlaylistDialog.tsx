"use client";

// クリップをプレイリストへ保存するダイアログ（YouTube の「保存」と同じ操作）
// チェックを付け外しするとその場で追加・削除し、下から新しいプレイリストも作れる。

import { useEffect, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PublicIcon from "@mui/icons-material/Public";
import type { PlaylistVisibility, PlaylistWithClips } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  clipId: string;
}

export function SaveToPlaylistDialog({ open, onClose, clipId }: Props) {
  // 開くたびに最新の一覧を読み直すため、開いている間だけ中身をマウントする
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      {open && <SaveBody clipId={clipId} />}
    </Dialog>
  );
}

function SaveBody({ clipId }: { clipId: string }) {
  const [playlists, setPlaylists] = useState<PlaylistWithClips[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<PlaylistVisibility>("private");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/playlists")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "読み込みに失敗しました");
        if (active) setPlaylists(data.playlists);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const replace = (updated: PlaylistWithClips) =>
    setPlaylists((prev) => prev?.map((p) => (p.id === updated.id ? updated : p)) ?? null);

  const toggle = async (playlist: PlaylistWithClips, include: boolean) => {
    setBusyId(playlist.id);
    setError(null);
    try {
      const res = include
        ? await fetch(`/api/playlists/${playlist.id}/clips`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clipId }),
          })
        : await fetch(`/api/playlists/${playlist.id}/clips/${clipId}`, {
            method: "DELETE",
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存に失敗しました");
      replace(data.playlist);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, visibility, clipId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "作成に失敗しました");
      setPlaylists((prev) => [data.playlist, ...(prev ?? [])]);
      setCreating(false);
      setTitle("");
      setVisibility("private");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DialogTitle>プレイリストに保存</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {playlists === null && !error && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {playlists?.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            まだプレイリストがありません。
          </Typography>
        )}
        <Stack>
          {playlists?.map((playlist) => {
            const included = playlist.clips.some((c) => c.id === clipId);
            return (
              <Stack
                key={playlist.id}
                direction="row"
                sx={{ alignItems: "center" }}
              >
                <FormControlLabel
                  sx={{ flexGrow: 1, minWidth: 0, mr: 0 }}
                  control={
                    <Checkbox
                      checked={included}
                      disabled={busyId === playlist.id}
                      onChange={(e) => toggle(playlist, e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="body2" noWrap>
                      {playlist.title}
                    </Typography>
                  }
                />
                {playlist.visibility === "private" ? (
                  <LockOutlinedIcon
                    fontSize="small"
                    sx={{ color: "text.secondary" }}
                    aria-label="非公開"
                  />
                ) : (
                  <PublicIcon
                    fontSize="small"
                    sx={{ color: "text.secondary" }}
                    aria-label="公開"
                  />
                )}
              </Stack>
            );
          })}
        </Stack>

        {playlists !== null && <Divider sx={{ my: 1.5 }} />}

        {playlists !== null && !creating && (
          <Button startIcon={<AddIcon />} onClick={() => setCreating(true)}>
            新しいプレイリストを作成
          </Button>
        )}
        {creating && (
          <Stack component="form" spacing={2} onSubmit={handleCreate} sx={{ pt: 1 }}>
            <TextField
              label="タイトル"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              size="small"
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <TextField
              select
              label="公開設定"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as PlaylistVisibility)}
              size="small"
              helperText={
                visibility === "public"
                  ? "リンクを知っている人は誰でも見られます"
                  : "自分だけが見られます"
              }
            >
              <MenuItem value="private">非公開</MenuItem>
              <MenuItem value="public">公開</MenuItem>
            </TextField>
            <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
              <Button onClick={() => setCreating(false)} disabled={submitting}>
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting || !title.trim()}
              >
                作成
              </Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </>
  );
}
