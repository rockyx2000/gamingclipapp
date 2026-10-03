"use client";

// ランキングの集計期間タブ。ゲームの絞り込みは残したまま期間だけ切り替える

import Link from "next/link";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import type { RankingPeriod } from "@/lib/types";

export const PERIOD_LABELS: Record<RankingPeriod, string> = {
  day: "日間",
  week: "週間",
  month: "月間",
  all: "総合",
};

interface Props {
  value: RankingPeriod;
  gameSlug?: string;
}

export function PeriodTabs({ value, gameSlug }: Props) {
  const hrefFor = (period: RankingPeriod) => {
    const params = new URLSearchParams({ period });
    if (gameSlug) params.set("game", gameSlug);
    return `/ranking?${params}`;
  };
  return (
    <Tabs value={value}>
      {(Object.keys(PERIOD_LABELS) as RankingPeriod[]).map((period) => (
        <Tab
          key={period}
          value={period}
          label={PERIOD_LABELS[period]}
          component={Link}
          href={hrefFor(period)}
        />
      ))}
    </Tabs>
  );
}
