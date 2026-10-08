// 再生数ランキングと急上昇。計算は web のモック（mock-db.ts）と同じにしてある。

import { gte, sql } from "drizzle-orm";
import type { ClipWithGame, RankedClip, RankingPeriod } from "@gamingclipapp/shared";
import type { Db } from "./db/client";
import { clipLikes, clipViewsHourly } from "./db/schema";
import { listClips } from "./queries";

const HOUR_MS = 60 * 60 * 1000;

const hourOf = (ms: number) => Math.floor(ms / HOUR_MS);

const PERIOD_HOURS: Record<Exclude<RankingPeriod, "all">, number> = {
  day: 24,
  week: 24 * 7,
  month: 24 * 30,
};

export function isRankingPeriod(value: string): value is RankingPeriod {
  return value === "all" || value in PERIOD_HOURS;
}

function byNewest(a: { createdAt: string }, b: { createdAt: string }): number {
  return b.createdAt.localeCompare(a.createdAt);
}

/** sinceHour 以降の再生数（シードの履歴 + 記録分）。clipId -> 数 */
async function viewsSince(db: Db, sinceHour: number): Promise<Map<string, number>> {
  const rows = await db
    .select({
      clipId: clipViewsHourly.clipId,
      total: sql<number>`sum(${clipViewsHourly.count})::int`,
    })
    .from(clipViewsHourly)
    .where(gte(clipViewsHourly.hour, sinceHour))
    .groupBy(clipViewsHourly.clipId);
  return new Map(rows.map((r) => [r.clipId, r.total]));
}

export interface RankingOptions {
  period: RankingPeriod;
  gameSlug?: string;
  limit?: number;
}

/** 再生数ランキング。期間内に 1 回も再生されていないクリップは載せない */
export async function listRanking(
  db: Db,
  { period, gameSlug, limit = 50 }: RankingOptions,
): Promise<RankedClip[]> {
  const clips = await listClips(db, { gameSlug });
  const sums =
    period === "all"
      ? undefined
      : await viewsSince(db, hourOf(Date.now()) - PERIOD_HOURS[period] + 1);
  return clips
    .map((clip) => ({ clip, periodViews: sums ? (sums.get(clip.id) ?? 0) : clip.views }))
    .filter((x) => x.periodViews > 0)
    .sort((a, b) => b.periodViews - a.periodViews || byNewest(a.clip, b.clip))
    .slice(0, limit)
    .map((x, i) => ({ ...x.clip, rank: i + 1, periodViews: x.periodViews }));
}

/** 急上昇の対象にする時間幅 */
const TRENDING_WINDOW_HOURS = 48;
/** この時間が経つと勢いの重みが半分になる */
const TRENDING_HALF_LIFE_HOURS = 12;
/** いいね 1 件を再生何回ぶんとみなすか */
const TRENDING_LIKE_WEIGHT = 5;

function decay(ageHours: number): number {
  return Math.pow(0.5, ageHours / TRENDING_HALF_LIFE_HOURS);
}

/**
 * 直近 48 時間の再生といいねを、新しいほど重く数えたスコアで並べる。
 * 総再生数が多いだけの古いクリップより、いま伸びているクリップが上に来る。
 */
export async function listTrending(
  db: Db,
  options: { gameSlug?: string; limit?: number } = {},
): Promise<ClipWithGame[]> {
  const now = Date.now();
  const nowHour = hourOf(now);
  const sinceHour = nowHour - TRENDING_WINDOW_HOURS + 1;

  const [clips, views, likes] = await Promise.all([
    listClips(db, { gameSlug: options.gameSlug }),
    db
      .select({
        clipId: clipViewsHourly.clipId,
        hour: clipViewsHourly.hour,
        total: sql<number>`sum(${clipViewsHourly.count})::int`,
      })
      .from(clipViewsHourly)
      .where(gte(clipViewsHourly.hour, sinceHour))
      .groupBy(clipViewsHourly.clipId, clipViewsHourly.hour),
    db
      .select({ clipId: clipLikes.clipId, likedAt: clipLikes.likedAt })
      .from(clipLikes)
      .where(gte(clipLikes.likedAt, new Date(now - TRENDING_WINDOW_HOURS * HOUR_MS))),
  ]);

  const scores = new Map<string, number>();
  const add = (clipId: string, n: number) => scores.set(clipId, (scores.get(clipId) ?? 0) + n);
  for (const v of views) add(v.clipId, v.total * decay(nowHour - v.hour));
  for (const l of likes) {
    const ageHours = (now - l.likedAt.getTime()) / HOUR_MS;
    if (ageHours <= TRENDING_WINDOW_HOURS) add(l.clipId, TRENDING_LIKE_WEIGHT * decay(ageHours));
  }

  return clips
    .map((clip) => ({ clip, score: scores.get(clip.id) ?? 0 }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 50)
    .map((x) => x.clip);
}
