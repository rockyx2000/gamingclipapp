// 検索サジェストとユーザー検索（@メンション・タグ付けの候補）

import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { SearchSuggestions, User } from "@gamingclipapp/shared";
import type { Db } from "./db/client";
import { clips, games, users } from "./db/schema";
import { userColumns } from "./mentions";

// LIKE のワイルドカードとして扱われる文字を、ただの文字として検索する
const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

const MAX_QUERY_LENGTH = 50;
const SUGGEST_LIMIT = 5;

/** ヘッダーの検索欄の候補。ゲーム名とクリップのタイトルを、前方一致を先にして返す */
export async function suggest(db: Db, rawQuery: string): Promise<SearchSuggestions> {
  const q = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  if (!q) return { games: [], clips: [] };
  const contains = `%${escapeLike(q)}%`;
  const prefix = `${escapeLike(q)}%`;

  const [gameRows, clipRows] = await Promise.all([
    db
      .select({ id: games.id, slug: games.slug, name: games.name, genre: games.genre })
      .from(games)
      .where(or(ilike(games.name, contains), ilike(games.slug, contains)))
      .orderBy(desc(sql`${games.name} ilike ${prefix}`), asc(games.sortOrder))
      .limit(SUGGEST_LIMIT),
    db
      .select({ id: clips.id, title: clips.title, gameName: games.name })
      .from(clips)
      .innerJoin(games, eq(clips.gameId, games.id))
      .where(ilike(clips.title, contains))
      .orderBy(desc(sql`${clips.title} ilike ${prefix}`), desc(clips.createdAt))
      .limit(SUGGEST_LIMIT),
  ]);
  return { games: gameRows as SearchSuggestions["games"], clips: clipRows };
}

/** ユーザー名か表示名の部分一致（前方一致を先に）。q が空なら先頭から */
export async function searchUsers(db: Db, rawQuery: string, limit = 8): Promise<User[]> {
  const q = rawQuery.trim().slice(0, 30);
  const contains = `%${escapeLike(q)}%`;
  const prefix = `${escapeLike(q)}%`;
  return db
    .select(userColumns)
    .from(users)
    .where(q ? or(ilike(users.username, contains), ilike(users.displayName, contains)) : undefined)
    .orderBy(
      ...(q ? [desc(sql`${users.username} ilike ${prefix}`)] : []),
      asc(users.username),
    )
    .limit(limit);
}
