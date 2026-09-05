import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getGame, listClips, listRecruits } from "@/lib/mock-db";
import { GameTabs } from "@/components/GameTabs";
import { displaySx } from "@/theme";

export const dynamic = "force-dynamic";

export default async function GameDetailPage(
  props: PageProps<"/games/[slug]">,
) {
  const { slug } = await props.params;
  const game = getGame(slug);
  if (!game) notFound();

  const clips = listClips({ gameSlug: slug });
  const recruits = listRecruits(slug);

  return (
    <>
      {/* ヒーローは飾らず、カバー画像を一枚のタイルとして置く */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 2, sm: 3 }}
        sx={{ alignItems: { sm: "flex-end" }, mb: 3 }}
      >
        <Box
          sx={{
            width: { xs: "100%", sm: 240 },
            flexShrink: 0,
            aspectRatio: "16 / 9",
            borderRadius: 1,
            bgcolor: "#000",
            backgroundImage: `url(${game.coverUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h1">{game.name}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {game.description}
          </Typography>
          <Stack direction="row" spacing={2.5} sx={{ mt: 1.5, alignItems: "baseline" }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "baseline" }}>
              <Typography component="span" sx={{ ...displaySx, fontSize: 28 }}>
                {clips.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                クリップ
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "baseline" }}>
              <Typography component="span" sx={{ ...displaySx, fontSize: 28 }}>
                {recruits.filter((r) => r.status === "open").length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                募集中
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Stack>
      <GameTabs clips={clips} recruits={recruits} />
    </>
  );
}
