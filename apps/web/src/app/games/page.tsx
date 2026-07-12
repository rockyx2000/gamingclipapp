import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { listGames } from "@/lib/mock-db";
import { GameCard } from "@/components/GameCard";
import { GameSearchBox } from "@/components/GameSearchBox";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "ゲーム" };

export default async function GamesPage(props: PageProps<"/games">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const games = listGames(q);

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2,
          mb: 3,
        }}
      >
        <Typography variant="h2">ゲームカテゴリ</Typography>
        <GameSearchBox initialQuery={q ?? ""} />
      </Box>
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
