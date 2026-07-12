"use client";

// 募集詳細ページのコメント一覧と投稿フォーム

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "next/link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { Comment } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { useAuth } from "./AuthProvider";

interface Props {
  recruitId: string;
  comments: Comment[];
}

export function CommentSection({ recruitId, comments }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/recruits/${recruitId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "コメントの投稿に失敗しました");
      }
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h3" sx={{ mb: 2 }}>
        コメント ({comments.length})
      </Typography>

      {user ? (
        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            multiline
            minRows={2}
            placeholder="コメントを書く（例: 参加希望です！ランクは〇〇です）"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || !body.trim()}
            >
              コメントする
            </Button>
          </Box>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          コメントするには
          <Link href="/login" style={{ marginLeft: 4, marginRight: 4 }}>
            ログイン
          </Link>
          が必要です。
        </Alert>
      )}

      <Stack spacing={2}>
        {comments.map((comment) => (
          <Paper key={comment.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
              <Avatar
                src={comment.author.avatarUrl}
                sx={{ width: 28, height: 28 }}
              />
              <Typography variant="subtitle2">
                {comment.author.displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {timeAgo(comment.createdAt)}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              {comment.body}
            </Typography>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
