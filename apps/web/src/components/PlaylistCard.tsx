"use client";

// プレイリスト一覧のカード。先頭クリップのサムネイルに本数を重ねる

import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import { displaySx } from "@/theme";

interface Props {
  href: string;
  title: string;
  count: number;
  thumbnailUrl?: string;
  /** タイトル下の補足（更新日時など） */
  meta: string;
  isPrivate?: boolean;
}

export function PlaylistCard({ href, title, count, thumbnailUrl, meta, isPrivate }: Props) {
  return (
    <Card elevation={0} sx={{ bgcolor: "transparent" }}>
      <CardActionArea component={Link} href={href}>
        <Box
          sx={{
            position: "relative",
            aspectRatio: "16 / 9",
            borderRadius: 1,
            bgcolor: "#000",
            backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            overflow: "hidden",
          }}
        >
          {/* 右側に本数の帯を重ねる（YouTube のプレイリストと同じ見せ方） */}
          <Stack
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "34%",
              bgcolor: "rgba(0,0,0,0.78)",
              color: "#fff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography component="span" sx={{ ...displaySx, fontSize: 26 }}>
              {count}
            </Typography>
            <PlaylistPlayIcon fontSize="small" />
          </Stack>
        </Box>
        <Box sx={{ pt: 1.25, pb: 1 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
              {title}
            </Typography>
            {isPrivate && (
              <LockOutlinedIcon
                sx={{ fontSize: 16, color: "text.secondary" }}
                aria-label="非公開"
              />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {meta}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
}
