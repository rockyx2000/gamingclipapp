"use client";

// 再生を 1 回だけ記録する。プリフェッチやページを開いただけでは数えず、
// 実際に再生が始まったときに呼ぶ。同じページで見直した分はここで、
// 短時間に開き直した分はサーバー側（VIEW_DEDUPE_MS）で弾く。

import { useCallback, useRef } from "react";

export function useRecordView(): (clipId: string) => void {
  const recorded = useRef(new Set<string>());
  return useCallback((clipId: string) => {
    if (recorded.current.has(clipId)) return;
    recorded.current.add(clipId);
    fetch(`/api/clips/${clipId}/view`, { method: "POST", keepalive: true }).catch(() => {
      // 数え損ねても視聴には影響しないので、次の再生でもう一度試せるようにだけする
      recorded.current.delete(clipId);
    });
  }, []);
}
