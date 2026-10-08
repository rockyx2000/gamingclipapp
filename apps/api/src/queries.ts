// 読み取りクエリ。返す形は packages/shared の型（Game / ClipWithGame）に合わせる。

import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { ClipWithGame, Game, GameGenre } from "@gamingclipapp/shared";
import type { Db } from "./db/client";
import { clips, games, users } from "./db/schema";

// LIKE のワイルドカードとして扱われる文字を、ただの文字として検索する
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

// games のみを select するクエリでは drizzle が列名を修飾しないため、${games.id} だと
// サブクエリ内の clips.id と取り違えて常に 0 になる。games.id は修飾して直接書く。
const clipCount = sql<number>`(select count(*)::int from clips as c where c.game_id = "games"."id")`;

const gameColumns = {
  id: games.id,
  slug: games.slug,
  name: games.name,
  genre: games.genre,
  coverUrl: games.coverUrl,
  description: games.description,
  clipCount,
};

type GameRow = {
  id: string;
  slug: string;
  name: string;
  genre: string;
  coverUrl: string;
  description: string;
  clipCount: number;
};

function toGame(row: GameRow): Game {
  return { ...row, genre: row.genre as GameGenre };
}

export interface GameFilter {
  query?: string;
  genre?: string;
}

export async function listGames(db: Db, filter: GameFilter = {}): Promise<Game[]> {
  const conditions: SQL[] = [];
  if (filter.genre) conditions.push(eq(games.genre, filter.genre));
  if (filter.query) {
    const pattern = `%${escapeLike(filter.query)}%`;
    conditions.push(or(ilike(games.name, pattern), ilike(games.slug, pattern))!);
  }
  const rows = await db
    .select(gameColumns)
    .from(games)
    .where(and(...conditions))
    .orderBy(asc(games.sortOrder));
  return rows.map(toGame);
}

export async function getGame(db: Db, slug: string): Promise<Game | undefined> {
  const [row] = await db.select(gameColumns).from(games).where(eq(games.slug, slug));
  return row ? toGame(row) : undefined;
}

export interface ClipFilter {
  gameSlug?: string;
  query?: string;
}

const clipSelect = {
  id: clips.id,
  title: clips.title,
  description: clips.description,
  videoUrl: clips.videoUrl,
  thumbnailUrl: clips.thumbnailUrl,
  durationSec: clips.durationSec,
  mimeType: clips.mimeType,
  sizeBytes: clips.sizeBytes,
  gameId: clips.gameId,
  // 表示する数は、シードの初期値に、記録した再生・いいねを足したもの（web のモックと同じ）。
  // clips は結合クエリでだけ使うので、列は修飾して直接書く
  views: sql<number>`"clips"."views" + coalesce((select sum(v.count) from clip_views_hourly v where v.clip_id = "clips"."id" and not v.seeded), 0)::int`,
  likes: sql<number>`"clips"."likes" + (select count(*) from clip_likes l where l.clip_id = "clips"."id")::int`,
  commentCount: sql<number>`(select count(*)::int from clip_comments cc where cc.clip_id = "clips"."id")`,
  createdAt: clips.createdAt,
  uploader: {
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    avatarUrl: users.avatarUrl,
  },
  game: gameColumns,
};

type ClipRow = Awaited<ReturnType<typeof selectClips>>[number];

function selectClips(db: Db, where: SQL | undefined) {
  return db
    .select(clipSelect)
    .from(clips)
    .innerJoin(games, eq(clips.gameId, games.id))
    .innerJoin(users, eq(clips.uploaderId, users.id))
    .where(where)
    .orderBy(desc(clips.createdAt), desc(clips.id));
}

function toClip(row: ClipRow): ClipWithGame {
  const { mimeType, sizeBytes, createdAt, game, ...rest } = row;
  return {
    ...rest,
    // アップロードされた動画だけが持つ値は、無いときはキーごと省く
    ...(mimeType !== null && { mimeType }),
    ...(sizeBytes !== null && { sizeBytes }),
    createdAt: createdAt.toISOString(),
    game: toGame(game),
  };
}

export async function listClips(db: Db, filter: ClipFilter = {}): Promise<ClipWithGame[]> {
  const conditions: SQL[] = [];
  if (filter.gameSlug) conditions.push(eq(games.slug, filter.gameSlug));
  if (filter.query) {
    const pattern = `%${escapeLike(filter.query)}%`;
    conditions.push(or(ilike(clips.title, pattern), ilike(clips.description, pattern))!);
  }
  const rows = await selectClips(db, and(...conditions));
  return rows.map(toClip);
}

export async function getClip(db: Db, id: string): Promise<ClipWithGame | undefined> {
  const [row] = await selectClips(db, eq(clips.id, id)).limit(1);
  return row ? toClip(row) : undefined;
}

/** 指定した ID のクリップを、渡した順に返す（存在しない ID は飛ばす） */
export async function listClipsByIds(db: Db, ids: string[]): Promise<ClipWithGame[]> {
  if (ids.length === 0) return [];
  const rows = await selectClips(db, inArray(clips.id, ids));
  const byId = new Map(rows.map((r) => [r.id, toClip(r)]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}
