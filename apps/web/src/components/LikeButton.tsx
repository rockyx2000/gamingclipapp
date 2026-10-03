"use client";

// PC 視聴ページのいいねボタン

import Chip from "@mui/material/Chip";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import { displaySx } from "@/theme";
import { useLike } from "./useLike";

interface Props {
  clipId: string;
  initialLiked: boolean;
  initialLikes: number;
}

export function LikeButton({ clipId, initialLiked, initialLikes }: Props) {
  const { liked, likes, toggle } = useLike(clipId, initialLiked, initialLikes);
  return (
    <Chip
      icon={liked ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
      label={likes.toLocaleString()}
      variant="outlined"
      clickable
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? "いいねを取り消す" : "いいね"}
      sx={{
        "& .MuiChip-label": { ...displaySx, fontSize: 16, pt: "1px" },
        "& .MuiChip-icon": { color: liked ? "primary.main" : undefined },
      }}
    />
  );
}
