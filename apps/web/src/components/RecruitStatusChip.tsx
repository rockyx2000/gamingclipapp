"use client";

// 募集の状態バッジ。募集中は「配信中」の表示に倣い、小さな金のドットだけで示す。
// 一覧では募集中が大半を占めるため、バッジ全体を金にすると目立ちすぎる。

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import type { RecruitStatus } from "@/lib/types";

interface Props {
  status: RecruitStatus;
  size?: "small" | "medium";
}

export function RecruitStatusChip({ status, size = "medium" }: Props) {
  if (status === "closed") {
    return <Chip label="募集終了" size={size} variant="outlined" />;
  }
  return (
    <Chip
      label="募集中"
      size={size}
      icon={
        <Box
          component="span"
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "primary.main",
            ml: "6px !important",
          }}
        />
      }
      sx={{ fontWeight: 600 }}
    />
  );
}
