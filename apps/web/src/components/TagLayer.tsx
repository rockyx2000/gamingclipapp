"use client";

// 映像の上に重ねて、ユーザーのタグを表示する層（表示専用）。
// 親は position: relative で、この層（inset: 0）が映像の枠と同じ大きさになる前提。
// 黒帯を除いた映像の位置に合わせるので、画面の大きさや映像の縦横比が違っても、同じ人の上に出る。

import { useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import PersonPinIcon from "@mui/icons-material/PersonPin";
import type { ClipTag } from "@/lib/types";
import { TagLabel } from "./TagLabel";
import { useContentRect } from "./useContentRect";

interface LayerProps {
  tags: ClipTag[];
  /** 映像の縦横比（幅 / 高さ）。読み込み前は undefined */
  aspect: number | undefined;
}

export function TagLayer({ tags, aspect }: LayerProps) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const rect = useContentRect(element, aspect);
  return (
    <Box ref={setElement} sx={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
      <Box
        sx={{
          position: "absolute",
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        }}
      >
        {tags.map((tag) => (
          <TagLabel key={tag.user.id} tag={tag} />
        ))}
      </Box>
    </Box>
  );
}

interface ToggleProps {
  count: number;
  shown: boolean;
  onToggle: () => void;
}

/** タグの表示を切り替えるボタン（Instagram の人物アイコンと同じ位置づけ） */
export function TagToggle({ count, shown, onToggle }: ToggleProps) {
  return (
    <IconButton
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={shown ? "タグを隠す" : `タグを表示（${count}人）`}
      aria-pressed={shown}
      size="small"
      sx={{
        color: "#fff",
        bgcolor: shown ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.6)",
        "&:hover": { bgcolor: shown ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.8)" },
      }}
    >
      <PersonPinIcon fontSize="small" />
    </IconButton>
  );
}
