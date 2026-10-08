// 現在のユーザー。セッション（httpOnly Cookie の gca_session）は apps/api が持つので、
// リクエストの Cookie を引き継いで /api/auth/me で引く。
// サーバーコンポーネント・Route Handler のどちらからでも呼べる。

import { cache } from "react";
import { cookies } from "next/headers";
import { apiGet, SESSION_COOKIE } from "./api";
import type { User } from "./types";

export { SESSION_COOKIE };

// 1 回のリクエストの中で何度呼ばれても、api への問い合わせは 1 回にする
export const getCurrentUser = cache(async (): Promise<User | undefined> => {
  const cookieStore = await cookies();
  if (!cookieStore.get(SESSION_COOKIE)?.value) return undefined;
  const { body } = await apiGet<{ user: User | null }>("/api/auth/me");
  return body.user ?? undefined;
});
