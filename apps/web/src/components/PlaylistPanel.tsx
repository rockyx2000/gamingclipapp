"use client";

// プレイリスト再生中に PC 視聴ページの右側に出す一覧。
// 今のクリップを強調し、クリックで同じプレイリストのまま別のクリップへ移る。

import Link from "next/link";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { PlaylistWithClips } from "@/lib/types";
import { formatDuration } from "@/lib/format";
import { colors, displaySx } from "@/theme";

interface Props {
  playlist: PlaylistWithClips;
  currentId: string;
}

export function PlaylistPanel({ playlist, currentId }: Props) {
  const index = playlist.clips.findIndex((c) => c.id === currentId);
  return (
    <Paper variant="outlined" sx={{ mb: 3, overflow: "hidden" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Typography
          variant="h3"
          component={Link}
          href={`/playlists/${playlist.id}`}
          sx={{ color: "text.primary", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
        >
          {playlist.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          {playlist.owner.displayName}
          {"　"}
          <Box component="span" sx={{ ...displaySx, fontSize: 14 }}>
            {index + 1} / {playlist.clips.length}
          </Box>
        </Typography>
      </Box>
      <Box sx={{ maxHeight: 420, overflowY: "auto" }}>
        {playlist.clips.map((clip, i) => {
          const current = clip.id === currentId;
          return (
            <Stack
              key={clip.id}
              direction="row"
              spacing={1.5}
              component={Link}
              href={`/clips/${clip.id}?list=${playlist.id}`}
              aria-current={current ? "true" : undefined}
              sx={{
                px: 1.5,
                py: 1,
                alignItems: "center",
                color: "text.primary",
                textDecoration: "none",
                bgcolor: current ? colors.raised : "transparent",
                "&:hover": { bgcolor: colors.raised },
              }}
            >
              <Typography
                component="span"
                sx={{ ...displaySx, fontSize: 14, width: 20, textAlign: "center", color: "text.secondary" }}
              >
                {current ? "▶" : i + 1}
              </Typography>
              <Box
                sx={{
                  position: "relative",
                  width: 96,
                  flexShrink: 0,
                  aspectRatio: "16 / 9",
                  borderRadius: 0.5,
                  bgcolor: "#000",
                  backgroundImage: `url(${clip.thumbnailUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <Box
                  sx={{
                    ...displaySx,
                    position: "absolute",
                    right: 3,
                    bottom: 3,
                    px: 0.5,
                    py: 0.25,
                    fontSize: 12,
                    color: "#fff",
                    bgcolor: "rgba(0,0,0,0.85)",
                    borderRadius: 0.5,
                  }}
                >
                  {formatDuration(clip.durationSec)}
                </Box>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
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
                <Typography variant="caption" color="text.secondary">
                  {clip.uploader.displayName}
                </Typography>
              </Box>
            </Stack>
          );
        })}
      </Box>
    </Paper>
  );
}
