// 現在のユーザー（読み取り用）。web のモックと同じ Cookie（gca_session）のセッション ID を、
// sessions テーブルで引く。セッションを作る（ログインする）処理はまだ移していない。

import { eq } from "drizzle-orm";
import { getCookie } from "hono/cookie";
import type { Context } from "hono";
import type { User } from "@gamingclipapp/shared";
import type { Db } from "./db/client";
import { sessions, users } from "./db/schema";

export const SESSION_COOKIE = "gca_session";

export async function currentUser(db: Db, c: Context): Promise<User | undefined> {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (!sessionId) return undefined;
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId));
  return row;
}

export async function listUsers(db: Db): Promise<User[]> {
  return db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .orderBy(users.id);
}
