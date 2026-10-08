import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { listTrending } from "@/lib/clips";
import { getGame, listGames } from "@/lib/games";
import { formatViews, timeAgo } from "@/lib/format";
import { ClipRow } from "@/components/ClipRow";
import { GameFilterSelect } from "@/components/GameFilterSelect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "急上昇" };

// 急上昇フィード。直近 48 時間の再生といいねの勢いで並べる（api の /api/trending）
export default async function TrendingPage(props: PageProps<"/trending">) {
  const searchParams = await props.searchParams;
  const rawGame = typeof searchParams.game === "string" ? searchParams.game : undefined;
  const game = rawGame ? await getGame(rawGame) : undefined;
  const clips = await listTrending({ gameSlug: game?.slug });

  return (
    <>
      <Box
        sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 1 }}
      >
        <Typography variant="h2" sx={{ flexGrow: 1 }}>
          急上昇
        </Typography>
        <GameFilterSelect games={await listGames()} value={game?.slug ?? ""} />
      </Box>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 2 }}>
        直近48時間で再生といいねが伸びているクリップです。新しい反応ほど重く数えます。
      </Typography>
      {clips.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4 }}>
          いま伸びているクリップはありません。
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {clips.map((clip, i) => (
            <ClipRow
              key={clip.id}
              clip={clip}
              rank={i + 1}
              meta={
                <>
                  {formatViews(clip.views)}
                  {"　"}
                  {timeAgo(clip.createdAt)}
                </>
              }
            />
          ))}
        </Stack>
      )}
    </>
  );
}
