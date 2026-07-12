"use client";

import Link from "next/link";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import type { Game } from "@/lib/types";

export function GameCard({ game }: { game: Game }) {
  return (
    <Card variant="outlined">
      <CardActionArea component={Link} href={`/games/${game.slug}`}>
        <CardMedia image={game.coverUrl} sx={{ aspectRatio: "16 / 9" }} />
        <CardContent>
          <Typography variant="h3">{game.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            クリップ {game.clipCount} 件
          </Typography>
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
