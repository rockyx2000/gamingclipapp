"use client";

// 入力のたびに呼ぶ検索 API 用。入力が止まってから取りに行き、古い応答は捨てる。
// url が null なら何もしない（結果は空に戻す）。

import { useEffect, useState } from "react";

export function useDebouncedFetch<T>(
  url: string | null,
  empty: T,
  delayMs = 200,
): { data: T; loading: boolean } {
  const [state, setState] = useState<{ url: string | null; data: T }>({ url: null, data: empty });
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoadingUrl(url);
      fetch(url, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : empty))
        .then((data: T) => setState({ url, data }))
        .catch(() => {})
        .finally(() => setLoadingUrl((current) => (current === url ? null : current)));
    }, delayMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // empty は呼び出し側で定数にする前提
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, delayMs]);

  return { data: url && state.url === url ? state.data : empty, loading: loadingUrl === url };
}
