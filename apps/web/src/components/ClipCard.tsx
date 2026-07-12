"use client";

import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import type { ClipWithGame } from "@/lib/types";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";

// ホームやゲーム詳細で使う横型（16:9）のクリップカード
export function ClipCard({ clip }: { clip: ClipWithGame }) {
  return (
    <Card elevation={0} sx={{ bgcolor: "transparent" }}>
      <CardActionArea component={Link} href={`/clips/${clip.id}`}>
        <Box sx={{ position: "relative" }}>
          <CardMedia
            image={clip.thumbnailUrl}
            sx={{ aspectRatio: "16 / 9", borderRadius: 3 }}
          />
          <Chip
            label={formatDuration(clip.durationSec)}
            size="small"
            sx={{
              position: "absolute",
              bottom: 8,
              right: 8,
              bgcolor: "rgba(0,0,0,0.8)",
              fontSize: 12,
              height: 22,
            }}
          />
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
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {clip.uploader.displayName} - {clip.game.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatViews(clip.views)} - {timeAgo(clip.createdAt)}
            </Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}
