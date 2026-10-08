// 現在のユーザー（読み取り用）。web のモックと同じ Cookie（gca_session）のセッション ID を、
// sessions テーブルで引く。セッションを作る（ログインする）処理はまだ移していない。

import { and, eq, gt } from "drizzle-orm";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";
import type { User } from "@gamingclipapp/shared";
import { SESSION_MAX_AGE_SEC, config } from "./config";
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
    .where(
      and(
        eq(sessions.id, sessionId),
        // Cookie の期限と揃える。期限切れの行は読まない
        gt(sessions.createdAt, new Date(Date.now() - SESSION_MAX_AGE_SEC * 1000)),
      ),
    );
  return row;
}

/** ユーザー名でユーザーを探してセッションを作り、Cookie を付ける。見つからなければ undefined */
export async function login(db: Db, c: Context, username: string): Promise<User | undefined> {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.username, username));
  if (!user) return undefined;
  const sessionId = crypto.randomUUID();
  await db.insert(sessions).values({ id: sessionId, userId: user.id });
  setCookie(c, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    secure: config.cookieSecure,
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return user;
}

export async function logout(db: Db, c: Context): Promise<void> {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (!sessionId) return;
  await db.delete(sessions).where(eq(sessions.id, sessionId));
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
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
