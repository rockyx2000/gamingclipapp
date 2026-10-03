"use client";

// いいねの状態と切り替え。押した瞬間に表示を変え（楽観的更新）、
// API が失敗したら元に戻す。PC の視聴ページとスマホのフィードで共有する。

import { useCallback, useRef, useState } from "react";
import { useRequireLogin } from "./useRequireLogin";

export interface LikeState {
  liked: boolean;
  likes: number;
  toggle: () => void;
}

export function useLike(
  clipId: string,
  initialLiked: boolean,
  initialLikes: number,
): LikeState {
  const requireLogin = useRequireLogin();
  const [state, setState] = useState({ liked: initialLiked, likes: initialLikes });
  // 連打したとき、古いリクエストの応答で新しい表示を上書きしないための通し番号
  const requestSeq = useRef(0);

  const toggle = useCallback(() => {
    if (!requireLogin()) return;
    const next = !state.liked;
    const before = state;
    setState({ liked: next, likes: state.likes + (next ? 1 : -1) });
    const seq = ++requestSeq.current;
    fetch(`/api/clips/${clipId}/like`, { method: next ? "PUT" : "DELETE" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const data: { liked: boolean; likes: number } = await res.json();
        if (seq === requestSeq.current) setState(data);
      })
      .catch(() => {
        if (seq === requestSeq.current) setState(before);
      });
  }, [clipId, requireLogin, state]);

  return { ...state, toggle };
}
