"use client";

import Link from "next/link";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Game } from "@/lib/types";
import { displaySx } from "@/theme";

export function GameCard({ game }: { game: Game }) {
  return (
    <Card variant="outlined">
      <CardActionArea component={Link} href={`/games/${game.slug}`}>
        <CardMedia image={game.coverUrl} sx={{ aspectRatio: "16 / 9", bgcolor: "#000" }} />
        <CardContent>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "baseline" }}>
            <Typography variant="h3" sx={{ flexGrow: 1 }}>
              {game.name}
            </Typography>
            <Typography component="span" sx={{ ...displaySx, fontSize: 22 }}>
              {game.clipCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              クリップ
            </Typography>
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {game.description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
