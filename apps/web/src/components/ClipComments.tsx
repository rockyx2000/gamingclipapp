"use client";

// クリップのコメント欄（PC の視聴ページと、スマホのコメントシートで共用）
// initialComments を渡せばそれを表示し、渡さなければ開いた時点で API から読む。
// 投稿・削除は API の結果で手元の一覧を更新し、ページの再読み込みはしない。

import { useEffect, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { MAX_CLIP_COMMENT_LENGTH, type Comment } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { displaySx } from "@/theme";
import { useAuth } from "./AuthProvider";
import { useRequireLogin } from "./useRequireLogin";

interface Props {
  clipId: string;
  /** クリップの投稿者。投稿者は他人のコメントも削除できる */
  uploaderId: string;
  initialComments?: Comment[];
  /** 件数が変わったら呼ばれる（スマホのコメントボタンの数字を合わせる用） */
  onCountChange?: (count: number) => void;
}

export function ClipComments({ clipId, uploaderId, initialComments, onCountChange }: Props) {
  const { user } = useAuth();
  const requireLogin = useRequireLogin();
  const [comments, setComments] = useState<Comment[] | null>(initialComments ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; comment: Comment } | null>(null);

  useEffect(() => {
    if (initialComments) return;
    let active = true;
    fetch(`/api/clips/${clipId}/comments`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "コメントを読み込めませんでした");
        if (active) setComments(data.comments);
      })
      .catch((err: Error) => {
        if (active) setLoadError(err.message);
      });
    return () => {
      active = false;
    };
  }, [clipId, initialComments]);

  const update = (next: Comment[]) => {
    setComments(next);
    onCountChange?.(next.length);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/clips/${clipId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "コメントの投稿に失敗しました");
      update([data.comment, ...(comments ?? [])]);
      setBody("");
      setFocused(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (comment: Comment) => {
    setMenu(null);
    setError(null);
    const res = await fetch(`/api/clips/${clipId}/comments/${comment.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "削除に失敗しました");
      return;
    }
    update((comments ?? []).filter((c) => c.id !== comment.id));
  };

  const canDelete = (comment: Comment) =>
    user !== null && (comment.author.id === user.id || uploaderId === user.id);

  return (
    <Box>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "baseline", mb: 2 }}>
        <Typography variant="h3">コメント</Typography>
        {comments && (
          <Typography component="span" sx={{ ...displaySx, fontSize: 18 }}>
            {comments.length}
          </Typography>
        )}
      </Stack>

      {user ? (
        <Stack
          component="form"
          direction="row"
          spacing={1.5}
          onSubmit={handleSubmit}
          sx={{ mb: 3, alignItems: "flex-start" }}
        >
          <Avatar src={user.avatarUrl} sx={{ width: 32, height: 32, mt: 0.5 }} />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <TextField
              fullWidth
              multiline
              maxRows={6}
              size="small"
              placeholder="コメントを追加"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => setFocused(true)}
              disabled={submitting}
              slotProps={{ htmlInput: { maxLength: MAX_CLIP_COMMENT_LENGTH } }}
              helperText={
                body.length > MAX_CLIP_COMMENT_LENGTH * 0.8
                  ? `${body.length} / ${MAX_CLIP_COMMENT_LENGTH}`
                  : undefined
              }
            />
            {(focused || body) && (
              <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", mt: 1 }}>
                <Button
                  onClick={() => {
                    setBody("");
                    setFocused(false);
                  }}
                  disabled={submitting}
                >
                  キャンセル
                </Button>
                <Button type="submit" variant="contained" disabled={submitting || !body.trim()}>
                  コメント
                </Button>
              </Stack>
            )}
          </Box>
        </Stack>
      ) : (
        <Button variant="outlined" onClick={() => requireLogin()} sx={{ mb: 3 }}>
          ログインしてコメントする
        </Button>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {loadError && <Alert severity="error">{loadError}</Alert>}
      {comments === null && !loadError && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      {comments?.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          まだコメントはありません。
        </Typography>
      )}

      <Stack spacing={2}>
        {comments?.map((comment) => (
          <Stack key={comment.id} direction="row" spacing={1.5}>
            <Avatar src={comment.author.avatarUrl} sx={{ width: 32, height: 32 }} />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                <Typography variant="subtitle2" sx={{ fontSize: 13 }}>
                  {comment.author.displayName}
                </Typography>
                {comment.author.id === uploaderId && (
                  <Typography variant="caption" color="text.secondary">
                    投稿者
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {timeAgo(comment.createdAt)}
                </Typography>
              </Stack>
              <Typography
                variant="body2"
                sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", mt: 0.25 }}
              >
                {comment.body}
              </Typography>
            </Box>
            {canDelete(comment) && (
              <IconButton
                size="small"
                aria-label="コメントの操作"
                onClick={(e) => setMenu({ anchor: e.currentTarget, comment })}
                sx={{ alignSelf: "flex-start" }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        ))}
      </Stack>

      <Menu anchorEl={menu?.anchor} open={menu !== null} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => menu && handleDelete(menu.comment)}>削除</MenuItem>
      </Menu>
    </Box>
  );
}
