import type { Metadata } from "next";
import Link from "next/link";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { listGames } from "@/lib/games";
import { GAME_GENRES } from "@/lib/types";
import { GameCard } from "@/components/GameCard";
import { GameSearchBox } from "@/components/GameSearchBox";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "ゲーム" };

// 選択中のフィルタは白地・黒文字で示す（メンバー募集の絞り込みと同じ見せ方）
const selectedChipSx = {
  bgcolor: "#f2f3f5",
  color: "#15171b",
  fontWeight: 700,
  "&:hover": { bgcolor: "#fff" },
} as const;

export default async function GamesPage(props: PageProps<"/games">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const rawGenre = typeof searchParams.genre === "string" ? searchParams.genre : undefined;
  const genre = GAME_GENRES.find((g) => g === rawGenre);
  // 検索とジャンルは組み合わせられる。ジャンルを選び直しても検索語は残す
  const games = await listGames({ query: q, genre });
  const hrefFor = (g?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (g) params.set("genre", g);
    const qs = params.toString();
    return qs ? `/games?${qs}` : "/games";
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="h2">ゲームカテゴリ</Typography>
        <GameSearchBox initialQuery={q ?? ""} />
      </Box>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1, mb: 3 }}>
        <Link href={hrefFor()} style={{ textDecoration: "none" }}>
          <Chip label="すべて" clickable sx={!genre ? selectedChipSx : undefined} />
        </Link>
        {GAME_GENRES.map((g) => (
          <Link key={g} href={hrefFor(g)} style={{ textDecoration: "none" }}>
            <Chip label={g} clickable sx={genre === g ? selectedChipSx : undefined} />
          </Link>
        ))}
      </Stack>
      {games.length === 0 && (
        <Typography color="text.secondary">
          該当するゲームが見つかりませんでした。
        </Typography>
      )}
      <Grid container spacing={2}>
        {games.map((game) => (
          <Grid key={game.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <GameCard game={game} />
          </Grid>
        ))}
      </Grid>
    </>
  );
}
