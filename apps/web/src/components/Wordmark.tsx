"use client";

// サイトのワードマーク。装飾は持たせず、書体だけで成立させる。

import Link from "next/link";
import Typography from "@mui/material/Typography";
import { displayFont } from "@/theme";

interface Props {
  size?: number;
  /** 動画の上に置くときは白固定にする */
  onVideo?: boolean;
}

export function Wordmark({ size = 24, onVideo = false }: Props) {
  return (
    <Typography
      component={Link}
      href="/"
      sx={{
        fontFamily: displayFont,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "0.04em",
        lineHeight: 1,
        textDecoration: "none",
        color: onVideo ? "#fff" : "text.primary",
        whiteSpace: "nowrap",
      }}
    >
      GAMECLIPS
    </Typography>
  );
}
