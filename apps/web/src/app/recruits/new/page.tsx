"use client";

// メンバー募集の新規投稿フォーム（要ログイン）

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useAuth } from "@/components/AuthProvider";
import type { Game } from "@/lib/types";

export default function NewRecruitPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [positions, setPositions] = useState("");
  const [rank, setRank] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => setGames(data.games))
      .catch(() => setGames([]));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/recruits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          title,
          body,
          positions: positions
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
          rank: rank.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "投稿に失敗しました");
      }
      router.push(`/recruits/${data.recruit.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSubmitting(false);
    }
  };

  if (!loading && !user) {
    return (
      <Alert severity="info">
        募集を投稿するにはログインが必要です。ヘッダーの「ログイン」から進んでください。
      </Alert>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 }, maxWidth: 640, mx: "auto" }}>
      <Typography variant="h2" sx={{ mb: 3 }}>
        メンバー募集を投稿
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
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
          <TextField
            required
            label="タイトル"
            placeholder="例: 【プラチナ帯】コンペ固定メンバー募集"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            required
            multiline
            minRows={4}
            label="募集内容"
            placeholder="活動時間帯、求めるロール、VCの有無などを書きましょう"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <TextField
            label="募集ポジション（カンマ区切り）"
            placeholder="例: イニシエーター, センチネル"
            value={positions}
            onChange={(e) => setPositions(e.target.value)}
          />
          <TextField
            label="ランク帯（任意）"
            placeholder="例: プラチナ〜ダイヤ"
            value={rank}
            onChange={(e) => setRank(e.target.value)}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting || !gameId || !title || !body}
          >
            投稿する
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
