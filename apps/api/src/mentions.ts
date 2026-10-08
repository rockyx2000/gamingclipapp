// @メンションの解釈。本文の @ユーザー名 のうち、実在するユーザーだけを拾う。

import { inArray, sql } from "drizzle-orm";
import { MAX_MENTIONS_PER_COMMENT, type User } from "@gamingclipapp/shared";
import type { Db } from "./db/client";
import { users } from "./db/schema";

// 直前が英数字・_・@ の @ は拾わない（メールアドレスや @@ を避ける）
const MENTION_PATTERN = /(?<![A-Za-z0-9_@])@([A-Za-z0-9_]{1,30})/g;

/** 本文から @ユーザー名 を取り出す（重複は除く。大文字小文字は区別しない） */
export function extractUsernames(body: string): string[] {
  const seen = new Set<string>();
  for (const match of body.matchAll(MENTION_PATTERN)) seen.add(match[1].toLowerCase());
  return [...seen];
}

export const userColumns = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
};

/** ユーザー名（大文字小文字は区別しない）からユーザーを引く。見つかったものだけ返す */
export async function findUsersByUsernames(db: Db, usernames: string[]): Promise<User[]> {
  if (usernames.length === 0) return [];
  return db
    .select(userColumns)
    .from(users)
    .where(
      inArray(
        sql`lower(${users.username})`,
        usernames.map((u) => u.toLowerCase()),
      ),
    );
}

/** 本文のメンションを解決する。実在するユーザーだけを、上限まで返す */
export async function resolveMentions(db: Db, body: string): Promise<User[]> {
  const usernames = extractUsernames(body).slice(0, MAX_MENTIONS_PER_COMMENT);
  return findUsersByUsernames(db, usernames);
}

export async function findUsersByIds(db: Db, ids: string[]): Promise<Map<string, User>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await db.select(userColumns).from(users).where(inArray(users.id, unique));
  return new Map(rows.map((u) => [u.id, u]));
}
