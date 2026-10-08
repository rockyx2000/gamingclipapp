"use client";

// コメント欄（クリップと募集で共用）。
// ページの表示を待たせないよう、開いたあとにブラウザから非同期で読み込む。
// 一覧は新しい順に 20 件ずつで、「もっと見る」で続きを足す。
// 投稿と削除は、API の返事を待たずに画面へ反映し（失敗したら戻す）、ページの再読み込みはしない。
// 入力欄では @ に続けてユーザー名を打つと候補が出る（MentionTextField）。

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { COMMENTS_PAGE_SIZE, type Comment, type CommentPage, type User } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { displaySx } from "@/theme";
import { useAuth } from "./AuthProvider";
import { CommentBody } from "./CommentBody";
import { MentionTextField } from "./MentionTextField";
import { useRequireLogin } from "./useRequireLogin";

interface Props {
  /** コメント一覧の URL。末尾に ?limit=&cursor= を付けて読む。投稿はこの URL への POST */
  listUrl: string;
  /** 削除の URL。渡さなければ削除の操作は出ない */
  deleteUrl?: (comment: Comment) => string;
  /** 削除できるか。渡さなければ、書いた本人だけ */
  canDelete?: (comment: Comment, user: User) => boolean;
  /** 名前の横に添える肩書き（例: クリップの投稿者） */
  badgeFor?: (comment: Comment) => string | undefined;
  placeholder: string;
  maxLength: number;
  /** 読み込む前に出しておく件数（ページが知っている総数） */
  initialCount?: number;
  /** 件数が変わったら呼ばれる（スマホのコメントボタンの数字を合わせる用） */
  onCountChange?: (count: number) => void;
}

const isPending = (comment: Comment) => comment.id.startsWith("tmp-");

export function CommentThread({
  listUrl,
  deleteUrl,
  canDelete,
  badgeFor,
  placeholder,
  maxLength,
  initialCount,
  onCountChange,
}: Props) {
  const { user } = useAuth();
  const requireLogin = useRequireLogin();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState<number | undefined>(initialCount);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [body, setBody] = useState("");
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; comment: Comment } | null>(null);
  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  const fetchPage = useCallback(
    async (cursor: string | null, signal?: AbortSignal): Promise<CommentPage> => {
      const params = new URLSearchParams({ limit: String(COMMENTS_PAGE_SIZE) });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`${listUrl}?${params}`, { signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "コメントを読み込めませんでした");
      return data as CommentPage;
    },
    [listUrl],
  );

  // ページの表示とは別に、開いたあとで 1 ページ目を読む
  useEffect(() => {
    const controller = new AbortController();
    fetchPage(null, controller.signal)
      .then((page) => {
        // 読み込み中に自分が投稿した分（仮のコメント）は残す
        setComments((prev) => [...(prev ?? []).filter(isPending), ...page.comments]);
        setNextCursor(page.nextCursor);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setLoadError(err.message);
      });
    return () => controller.abort();
  }, [fetchPage]);

  const changeTotal = useCallback((delta: number) => {
    setTotal((prev) => {
      const next = Math.max(0, (prev ?? 0) + delta);
      onCountChangeRef.current?.(next);
      return next;
    });
  }, []);

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(nextCursor);
      setComments((prev) => {
        const seen = new Set((prev ?? []).map((c) => c.id));
        return [...(prev ?? []), ...page.comments.filter((c) => !seen.has(c.id))];
      });
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || !user) return;
    const tempId = `tmp-${Date.now()}`;
    const pending: Comment = {
      id: tempId,
      author: user,
      body: text,
      createdAt: new Date().toISOString(),
      mentions: [],
    };
    setSubmitting(true);
    setError(null);
    setComments((prev) => [pending, ...(prev ?? [])]);
    changeTotal(1);
    setBody("");
    setFocused(false);
    try {
      const res = await fetch(listUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "コメントの投稿に失敗しました");
      setComments((prev) => (prev ?? []).map((c) => (c.id === tempId ? (data.comment as Comment) : c)));
    } catch (err) {
      // 失敗したら表示を戻し、書いた文を入力欄に返す
      setComments((prev) => (prev ?? []).filter((c) => c.id !== tempId));
      changeTotal(-1);
      setBody(text);
      setFocused(true);
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (comment: Comment) => {
    setMenu(null);
    if (!deleteUrl) return;
    setError(null);
    const index = (comments ?? []).findIndex((c) => c.id === comment.id);
    setComments((prev) => (prev ?? []).filter((c) => c.id !== comment.id));
    changeTotal(-1);
    const res = await fetch(deleteUrl(comment), { method: "DELETE" });
    if (!res.ok) {
      // 失敗したら元の位置に戻す
      const data = await res.json().catch(() => ({}));
      setComments((prev) => {
        const next = [...(prev ?? [])];
        next.splice(Math.max(index, 0), 0, comment);
        return next;
      });
      changeTotal(1);
      setError(data.error ?? "削除に失敗しました");
    }
  };

  const mayDelete = (comment: Comment) =>
    deleteUrl !== undefined &&
    user !== null &&
    !isPending(comment) &&
    (canDelete ? canDelete(comment, user) : comment.author.id === user.id);

  const shownTotal = total ?? comments?.length;

  return (
    <Box>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "baseline", mb: 2 }}>
        <Typography variant="h3">コメント</Typography>
        {shownTotal !== undefined && (
          <Typography component="span" sx={{ ...displaySx, fontSize: 18 }}>
            {shownTotal}
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
            <MentionTextField
              fullWidth
              multiline
              maxRows={6}
              size="small"
              placeholder={placeholder}
              value={body}
              onChange={setBody}
              onFocus={() => setFocused(true)}
              slotProps={{ htmlInput: { maxLength } }}
              helperText={body.length > maxLength * 0.8 ? `${body.length} / ${maxLength}` : undefined}
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
        <Stack spacing={2} aria-label="コメントを読み込み中">
          {[0, 1, 2].map((i) => (
            <Stack key={i} direction="row" spacing={1.5}>
              <Skeleton variant="circular" width={32} height={32} />
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton width="30%" />
                <Skeleton width="80%" />
              </Box>
            </Stack>
          ))}
        </Stack>
      )}
      {comments?.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          まだコメントはありません。
        </Typography>
      )}

      <Stack spacing={2}>
        {comments?.map((comment) => (
          <Stack key={comment.id} direction="row" spacing={1.5} sx={{ opacity: isPending(comment) ? 0.6 : 1 }}>
            <Avatar src={comment.author.avatarUrl} sx={{ width: 32, height: 32 }} />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                <Typography variant="subtitle2" sx={{ fontSize: 13 }}>
                  {comment.author.displayName}
                </Typography>
                {badgeFor?.(comment) && (
                  <Typography variant="caption" color="text.secondary">
                    {badgeFor(comment)}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {isPending(comment) ? "送信中…" : timeAgo(comment.createdAt)}
                </Typography>
              </Stack>
              <CommentBody comment={comment} />
            </Box>
            {mayDelete(comment) && (
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

      {nextCursor && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Button onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? <CircularProgress size={18} /> : "もっと見る"}
          </Button>
        </Box>
      )}

      <Menu anchorEl={menu?.anchor} open={menu !== null} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => menu && handleDelete(menu.comment)}>削除</MenuItem>
      </Menu>
    </Box>
  );
}
