import type { Metadata } from "next";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { listGames, listRecruits } from "@/lib/mock-db";
import { RecruitCard } from "@/components/RecruitCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "メンバー募集" };

// 選択中のフィルタは白地・黒文字で示す
const selectedChipSx = {
  bgcolor: "#f2f3f5",
  color: "#15171b",
  fontWeight: 700,
  "&:hover": { bgcolor: "#fff" },
} as const;

export default async function RecruitsPage(props: PageProps<"/recruits">) {
  const searchParams = await props.searchParams;
  const gameSlug =
    typeof searchParams.game === "string" ? searchParams.game : undefined;
  const recruits = listRecruits(gameSlug);
  const games = listGames();

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

      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1, mb: 3 }}>
        <Link href="/recruits" style={{ textDecoration: "none" }}>
          <Chip label="すべて" clickable sx={!gameSlug ? selectedChipSx : undefined} />
        </Link>
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/recruits?game=${game.slug}`}
            style={{ textDecoration: "none" }}
          >
            <Chip
              label={game.name}
              clickable
              sx={gameSlug === game.slug ? selectedChipSx : undefined}
            />
          </Link>
        ))}
      </Stack>

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
