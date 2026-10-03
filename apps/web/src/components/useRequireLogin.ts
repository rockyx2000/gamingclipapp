"use client";

// ログインが必要な操作の入口。未ログインならログインページへ送り、
// ログイン後に今のページへ戻れるよう next に現在の URL を渡す。

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export function useRequireLogin(): () => boolean {
  const { user } = useAuth();
  const router = useRouter();
  return useCallback(() => {
    if (user) return true;
    const here = window.location.pathname + window.location.search;
    router.push(`/login?next=${encodeURIComponent(here)}`);
    return false;
  }, [user, router]);
}
