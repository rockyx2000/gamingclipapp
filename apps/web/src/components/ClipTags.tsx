"use client";

// クリップに映っているユーザー（投稿者がタグ付けしたもの）の表示。
// タグは、付けられた本人と投稿者が外せる（本人が望まないタグを残さないため）。

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { User } from "@/lib/types";
import { useAuth } from "./AuthProvider";

interface Props {
  clipId: string;
  uploaderId: string;
  initialTags: User[];
}

export function ClipTags({ clipId, uploaderId, initialTags }: Props) {
  const { user } = useAuth();
  const [tags, setTags] = useState(initialTags);
  const [error, setError] = useState<string | null>(null);

  if (tags.length === 0 && !error) return null;

  const mayRemove = (tagged: User) =>
    user !== null && (user.id === uploaderId || user.id === tagged.id);

  const handleRemove = async (tagged: User) => {
    setError(null);
    const res = await fetch(`/api/clips/${clipId}/tags/${tagged.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "タグを外せませんでした");
      return;
    }
    setTags(data.tags);
  };

  return (
    <Stack spacing={1} sx={{ mt: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          映っているユーザー
        </Typography>
        {tags.map((tagged) => (
          <Chip
            key={tagged.id}
            size="small"
            variant="outlined"
            avatar={<Avatar src={tagged.avatarUrl} alt="" />}
            label={`${tagged.displayName} @${tagged.username}`}
            onDelete={mayRemove(tagged) ? () => handleRemove(tagged) : undefined}
          />
        ))}
      </Stack>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}
