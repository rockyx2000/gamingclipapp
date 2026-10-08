import type { RankingPeriod } from "./types";

// "use client" のコンポーネントから値をエクスポートしてもサーバーコンポーネントでは
// 参照にしかならないので、期間の表示名はクライアント境界の外に置く。
export const PERIOD_LABELS: Record<RankingPeriod, string> = {
  day: "日間",
  week: "週間",
  month: "月間",
  all: "総合",
};
