"use client";

// クリップのアップロードフォーム（モック: ファイルは実際には送信されず、
// サーバー側でサンプル動画が割り当てられる）

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useAuth } from "@/components/AuthProvider";
import type { ClipType, Game } from "@/lib/types";

export default function UploadPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [type, setType] = useState<ClipType>("clip");
  const [gameId, setGameId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => setGames(data.games))
      .catch(() => setGames([]));
  }, []);

  const maxSec = type === "short" ? 60 : 120;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type,
          gameId,
          durationSec: type === "short" ? 15 : 60,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "アップロードに失敗しました");
      }
      router.push(`/clips/${data.clip.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSubmitting(false);
    }
  };

  if (!loading && !user) {
    return (
      <Alert severity="info">
        クリップをアップロードするにはログインが必要です。ヘッダーの「ログイン」から進んでください。
      </Alert>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 }, maxWidth: 640, mx: "auto" }}>
      <Typography variant="h2" sx={{ mb: 1 }}>
        クリップをアップロード
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        モック版のため、動画ファイルは実際には保存されず、サンプル動画が割り当てられます。
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}

          <ToggleButtonGroup
            exclusive
            value={type}
            onChange={(_, v) => v && setType(v)}
            fullWidth
          >
            <ToggleButton value="clip">クリップ（最大2分）</ToggleButton>
            <ToggleButton value="short">ショート（最大60秒）</ToggleButton>
          </ToggleButtonGroup>

          <Button
            component="label"
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            sx={{ py: 2, borderStyle: "dashed" }}
          >
            {fileName ?? `動画ファイルを選択（最大${maxSec}秒）`}
            <input
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </Button>

          <TextField
            required
            label="タイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            multiline
            minRows={3}
            label="説明"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            select
            required
            label="ゲーム"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          >
            {games.map((game) => (
              <MenuItem key={game.id} value={game.id}>
                {game.name}
              </MenuItem>
            ))}
          </TextField>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting || !title || !gameId}
          >
            アップロード
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
