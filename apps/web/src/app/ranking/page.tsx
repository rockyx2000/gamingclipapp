import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getGame, isRankingPeriod, listGames, listRanking } from "@/lib/mock-db";
import { formatViews, timeAgo } from "@/lib/format";
import { ClipRow } from "@/components/ClipRow";
import { GameFilterSelect } from "@/components/GameFilterSelect";
import { PeriodTabs } from "@/components/PeriodTabs";
import { PERIOD_LABELS } from "@/lib/period";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "再生数ランキング" };

// 再生数ランキング。?period=day|week|month|all（既定は日間）と ?game=<slug> で絞り込む
export default async function RankingPage(props: PageProps<"/ranking">) {
  const searchParams = await props.searchParams;
  const rawPeriod = typeof searchParams.period === "string" ? searchParams.period : "day";
  const period = isRankingPeriod(rawPeriod) ? rawPeriod : "day";
  const rawGame = typeof searchParams.game === "string" ? searchParams.game : undefined;
  const game = rawGame ? getGame(rawGame) : undefined;

  const clips = listRanking({ period, gameSlug: game?.slug });

  return (
    <>
      <Box
        sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 1 }}
      >
        <Typography variant="h2" sx={{ flexGrow: 1 }}>
          再生数ランキング
        </Typography>
        <GameFilterSelect games={listGames()} value={game?.slug ?? ""} />
      </Box>
      <PeriodTabs value={period} gameSlug={game?.slug} />
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5, mb: 1 }}>
        {period === "all"
          ? "公開からの総再生数で並べています。"
          : `直近${{ day: "24時間", week: "7日間", month: "30日間" }[period]}の再生数で並べています。`}
      </Typography>
      {clips.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4 }}>
          この期間に再生されたクリップはまだありません。
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {clips.map((clip) => (
            <ClipRow
              key={clip.id}
              clip={clip}
              rank={clip.rank}
              meta={
                <>
                  {period === "all"
                    ? formatViews(clip.periodViews)
                    : `${PERIOD_LABELS[period]} ${formatViews(clip.periodViews)}`}
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
