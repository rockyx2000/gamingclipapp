"use client";

// ランキング・急上昇・プレイリストで使う横並びのクリップ行
// 左に順位（任意）、サムネイル、右にタイトルと補足情報を並べる。

import type { ReactNode } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ClipWithGame } from "@/lib/types";
import { formatDuration } from "@/lib/format";
import { colors, displaySx } from "@/theme";
import { HoverPreview } from "./HoverPreview";

interface Props {
  clip: ClipWithGame;
  /** 1 始まりの順位。1 位だけアクセント色にする */
  rank?: number;
  /** 視聴ページへのリンクに付けるクエリ（プレイリスト再生の ?list= など） */
  query?: string;
  /** タイトル下の 2 行目 */
  meta: ReactNode;
  /** 行の右端に置く操作（並べ替え・削除など） */
  actions?: ReactNode;
}

export function ClipRow({ clip, rank, query, meta, actions }: Props) {
  return (
    <Stack
      direction="row"
      spacing={{ xs: 1.5, sm: 2 }}
      sx={{
        alignItems: "center",
        py: 1,
        px: 1,
        borderRadius: 1,
        "&:hover": { bgcolor: colors.surface },
      }}
    >
      {rank !== undefined && (
        <Typography
          component="span"
          sx={{
            ...displaySx,
            fontSize: { xs: 22, sm: 30 },
            width: { xs: 28, sm: 44 },
            flexShrink: 0,
            textAlign: "center",
            color: rank === 1 ? "primary.main" : rank <= 3 ? "text.primary" : "text.secondary",
          }}
        >
          {rank}
        </Typography>
      )}
      <Stack
        direction="row"
        spacing={{ xs: 1.5, sm: 2 }}
        component={Link}
        href={`/clips/${clip.id}${query ?? ""}`}
        sx={{
          flexGrow: 1,
          minWidth: 0,
          alignItems: "flex-start",
          color: "text.primary",
          textDecoration: "none",
        }}
      >
        <HoverPreview
          src={clip.videoUrl}
          poster={clip.thumbnailUrl}
          sx={{
            width: { xs: 112, sm: 200 },
            flexShrink: 0,
            aspectRatio: "16 / 9",
            borderRadius: 1,
          }}
        >
          <Box
            sx={{
              ...displaySx,
              position: "absolute",
              right: 4,
              bottom: 4,
              px: 0.5,
              py: 0.25,
              fontSize: 13,
              color: "#fff",
              bgcolor: "rgba(0,0,0,0.85)",
              borderRadius: 0.5,
            }}
          >
            {formatDuration(clip.durationSec)}
          </Box>
        </HoverPreview>
        <Box sx={{ minWidth: 0, pt: 0.25 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {clip.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            {clip.uploader.displayName}
            {" ・ "}
            {clip.game.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div">
            {meta}
          </Typography>
        </Box>
      </Stack>
      {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
    </Stack>
  );
}
