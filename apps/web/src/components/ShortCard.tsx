"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import BoltIcon from "@mui/icons-material/Bolt";
import type { ClipWithGame } from "@/lib/types";
import { formatViews } from "@/lib/format";

// ショート動画用の縦型（9:16）カード
export function ShortCard({ clip }: { clip: ClipWithGame }) {
  return (
    <Card elevation={0} sx={{ bgcolor: "transparent", width: 160, flexShrink: 0 }}>
      <CardActionArea component={Link} href={`/shorts?start=${clip.id}`}>
        <Box sx={{ position: "relative" }}>
          <CardMedia
            image={clip.thumbnailUrl}
            sx={{ aspectRatio: "9 / 16", borderRadius: 3 }}
          />
          <BoltIcon
            fontSize="small"
            sx={{ position: "absolute", top: 8, left: 8, color: "#fff" }}
          />
        </Box>
        <Box sx={{ pt: 1 }}>
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
            {formatViews(clip.views)}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
}
