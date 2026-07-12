// モックセッションの共通ヘルパー
// httpOnly Cookie にセッション ID を保存する。サーバーコンポーネント・
// Route Handler の両方から現在のユーザーを取得できる。

import { cookies } from "next/headers";
import { getSessionUser } from "./mock-db";
import type { User } from "./types";

export const SESSION_COOKIE = "gca_session";

export async function getCurrentUser(): Promise<User | undefined> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  return getSessionUser(sessionId);
}
