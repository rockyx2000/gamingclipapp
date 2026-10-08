import type { Metadata } from "next";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { listRecruits } from "@/lib/mock-db";
import { listGames } from "@/lib/games";
import { GameFilterSelect } from "@/components/GameFilterSelect";
import { RecruitCard } from "@/components/RecruitCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "メンバー募集" };

export default async function RecruitsPage(props: PageProps<"/recruits">) {
  const searchParams = await props.searchParams;
  const gameSlug =
    typeof searchParams.game === "string" ? searchParams.game : undefined;
  const recruits = listRecruits(gameSlug);

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
        <Typography variant="h2">メンバー募集掲示板</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Link href="/recruits/new" style={{ textDecoration: "none" }}>
          <Button variant="contained" startIcon={<AddIcon />}>
            募集を投稿
          </Button>
        </Link>
      </Box>

      <Box sx={{ mb: 3 }}>
        <GameFilterSelect games={await listGames()} value={gameSlug ?? ""} />
      </Box>

      {recruits.length === 0 && (
        <Typography color="text.secondary">
          募集はまだありません。最初の募集を投稿してみましょう。
        </Typography>
      )}
      <Stack spacing={2}>
        {recruits.map((recruit) => (
          <RecruitCard key={recruit.id} recruit={recruit} />
        ))}
      </Stack>
    </>
  );
}
