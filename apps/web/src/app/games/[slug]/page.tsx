import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { getGame, listClips, listRecruits } from "@/lib/mock-db";
import { GameTabs } from "@/components/GameTabs";

export const dynamic = "force-dynamic";

export default async function GameDetailPage(
  props: PageProps<"/games/[slug]">,
) {
  const { slug } = await props.params;
  const game = getGame(slug);
  if (!game) notFound();

  const clips = listClips({ gameSlug: slug, type: "clip" });
  const shorts = listClips({ gameSlug: slug, type: "short" });
  const recruits = listRecruits(slug);

  return (
    <>
      <Box
        sx={{
          height: 180,
          borderRadius: 3,
          backgroundImage: `linear-gradient(rgba(15,15,15,0.2), rgba(15,15,15,0.95)), url(${game.coverUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          p: 3,
          mb: 2,
        }}
      >
        <Typography variant="h1">{game.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {game.description}
        </Typography>
      </Box>
      <GameTabs clips={clips} shorts={shorts} recruits={recruits} />
    </>
  );
}
