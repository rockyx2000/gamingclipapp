// セッションの共通ヘルパー
// httpOnly Cookie にセッション ID を保存する。サーバーコンポーネント・
// Route Handler の両方から現在のユーザーを取得できる。
// API_URL があれば api のセッションで、無ければモックのセッションで判定する。

import { cache } from "react";
import { cookies } from "next/headers";
import { apiGet, SESSION_COOKIE } from "./api";
import { API_URL } from "./config";
import { getSessionUser } from "./mock-db";
import type { User } from "./types";

export { SESSION_COOKIE };

// 1 回のリクエストの中で何度呼ばれても、api への問い合わせは 1 回にする
const currentUserFromApi = cache(async (): Promise<User | undefined> => {
  const cookieStore = await cookies();
  if (!cookieStore.get(SESSION_COOKIE)?.value) return undefined;
  const { body } = await apiGet<{ user: User | null }>("/api/auth/me");
  return body.user ?? undefined;
});

export async function getCurrentUser(): Promise<User | undefined> {
  if (API_URL) return currentUserFromApi();
  const cookieStore = await cookies();
  return getSessionUser(cookieStore.get(SESSION_COOKIE)?.value);
}
