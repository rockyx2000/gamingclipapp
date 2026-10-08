"use client";

// 枠の大きさを見張って、その中で映像が映っている長方形（contain）を返す。
// 映像のタグを、黒帯を除いた映像の上に重ねるために使う。

import { useEffect, useState } from "react";
import { containRect, type ContentRect } from "@/lib/clip-tags";

const EMPTY: ContentRect = { left: 0, top: 0, width: 0, height: 0 };

/** element は state で持った DOM 要素（描画中に ref を読まないため）。aspect は映像の幅 / 高さ */
export function useContentRect(element: HTMLElement | null, aspect: number | undefined): ContentRect {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return size ? containRect(size.w, size.h, aspect) : EMPTY;
}
