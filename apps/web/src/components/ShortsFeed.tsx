"use client";

// ショート動画の縦スクロールフィード（スクロールスナップ式）

import { useEffect, useRef } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Link from "next/link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ClipWithGame } from "@/lib/types";
import { formatViews } from "@/lib/format";

interface Props {
  shorts: ClipWithGame[];
  startId?: string;
}

export function ShortsFeed({ shorts, startId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // start パラメータで指定されたショートまでスクロールする
  useEffect(() => {
    if (!startId || !containerRef.current) return;
    const target = containerRef.current.querySelector(
      `[data-short-id="${startId}"]`,
    );
    target?.scrollIntoView({ behavior: "instant", block: "start" });
  }, [startId]);

  return (
    <Box
      ref={containerRef}
      sx={{
        height: "calc(100vh - 112px)",
        overflowY: "auto",
        scrollSnapType: "y mandatory",
        borderRadius: 3,
      }}
    >
      {shorts.map((clip) => (
        <Box
          key={clip.id}
          data-short-id={clip.id}
          sx={{
            height: "100%",
            scrollSnapAlign: "start",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            mb: 2,
          }}
        >
          <Box
            sx={{
              position: "relative",
              height: "100%",
              aspectRatio: "9 / 16",
              maxWidth: "100%",
            }}
          >
            <Box
              component="video"
              src={clip.videoUrl}
              poster={clip.thumbnailUrl}
              controls
              muted
              loop
              playsInline
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 3,
                bgcolor: "#000",
              }}
            />
            <Stack
              sx={{
                position: "absolute",
                left: 12,
                right: 12,
                bottom: 20,
                pointerEvents: "none",
              }}
              spacing={0.5}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Avatar
                  src={clip.uploader.avatarUrl}
                  sx={{ width: 28, height: 28 }}
                />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {clip.uploader.displayName}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {clip.title}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ pointerEvents: "auto" }}>
                <Chip
                  label={clip.game.name}
                  size="small"
                  color="secondary"
                  component={Link}
                  href={`/games/${clip.game.slug}`}
                  clickable
                />
                <Chip
                  label={formatViews(clip.views)}
                  size="small"
                  sx={{ bgcolor: "rgba(0,0,0,0.6)" }}
                />
              </Stack>
            </Stack>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
