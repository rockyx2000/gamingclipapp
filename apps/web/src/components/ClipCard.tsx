"use client";

import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import type { ClipWithGame } from "@/lib/types";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";
import { displaySx } from "@/theme";

// ホームやゲーム詳細で使う横型（16:9）のクリップカード
export function ClipCard({ clip }: { clip: ClipWithGame }) {
  return (
    <Card elevation={0} sx={{ bgcolor: "transparent" }}>
      <CardActionArea component={Link} href={`/clips/${clip.id}`}>
        <Box sx={{ position: "relative" }}>
          <CardMedia
            image={clip.thumbnailUrl}
            sx={{ aspectRatio: "16 / 9", borderRadius: 1, bgcolor: "#000" }}
          />
          {/* 再生時間: 配信オーバーレイ風のコンデンス数字 */}
          <Box
            sx={{
              ...displaySx,
              position: "absolute",
              bottom: 6,
              right: 6,
              px: 0.75,
              py: 0.375,
              fontSize: 14,
              color: "#fff",
              bgcolor: "rgba(0,0,0,0.85)",
              borderRadius: 0.5,
            }}
          >
            {formatDuration(clip.durationSec)}
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, pt: 1.5, pb: 1 }}>
          <Avatar
            src={clip.uploader.avatarUrl}
            sx={{ width: 36, height: 36 }}
          />
          <Box sx={{ minWidth: 0 }}>
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
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
              {clip.uploader.displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {clip.game.name}
              {"　"}
              {formatViews(clip.views)}
              {"　"}
              {timeAgo(clip.createdAt)}
            </Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}
