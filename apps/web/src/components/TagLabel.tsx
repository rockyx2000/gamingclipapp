"use client";

// 映像の上に出すユーザーのタグ（名前の札）。指す位置（x, y）の少し下に、上向きの三角つきで出す。

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import type { ClipTag } from "@/lib/types";

interface Props {
  tag: Pick<ClipTag, "x" | "y"> & { user: Pick<ClipTag["user"], "displayName" | "username"> };
  /** 札の右に出す操作（編集中の × など） */
  action?: ReactNode;
  /** 札を掴んで動かせるときの、ポインタ操作の受け口 */
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  /** 先頭の 1 文字目などを含め、読み上げ用の名前 */
  title?: string;
}

export function TagLabel({ tag, action, onPointerDown, title }: Props) {
  return (
    <Box
      title={title ?? `@${tag.user.username}`}
      onPointerDown={onPointerDown}
      sx={{
        position: "absolute",
        left: `${tag.x * 100}%`,
        top: `${tag.y * 100}%`,
        // 指す位置が札の上辺の中央に来るようにする
        transform: "translate(-50%, 8px)",
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        maxWidth: "60%",
        px: 1,
        py: 0.375,
        borderRadius: 1,
        bgcolor: "rgba(20,22,26,0.92)",
        border: "1px solid rgba(255,255,255,0.35)",
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.3,
        whiteSpace: "nowrap",
        touchAction: onPointerDown ? "none" : undefined,
        cursor: onPointerDown ? "grab" : "default",
        userSelect: "none",
        "&::before": {
          content: '""',
          position: "absolute",
          left: "50%",
          top: -5,
          width: 8,
          height: 8,
          bgcolor: "rgba(20,22,26,0.92)",
          borderLeft: "1px solid rgba(255,255,255,0.35)",
          borderTop: "1px solid rgba(255,255,255,0.35)",
          transform: "translateX(-50%) rotate(45deg)",
        },
      }}
    >
      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {tag.user.displayName}
      </Box>
      {action}
    </Box>
  );
}
