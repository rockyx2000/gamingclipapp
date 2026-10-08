"use client";

// PC 向け視聴ページのプレイヤー枠。
// PC レイアウトが表示されている（md 以上）ときだけ自動再生する。
// スマホでは PC レイアウトごと display:none になり、再生は MobileClipFeed が担当するため、
// この要素が裏で音を鳴らさないよう autoPlay は画面幅で制御する。
// 再生が始まったら再生数を記録し、nextHref があれば（プレイリスト再生中）最後まで見たら次へ進む。

import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { ClipTag } from "@/lib/types";
import { VideoPlayer } from "./VideoPlayer";
import { useRecordView } from "./useRecordView";

interface Props {
  clipId: string;
  src: string;
  poster: string;
  /** 再生し終えたら移動する URL（プレイリストの次のクリップ） */
  nextHref?: string;
  /** 映像の上に付けられたユーザーのタグ */
  tags?: ClipTag[];
}

export function WatchVideo({ clipId, src, poster, nextHref, tags }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const recordView = useRecordView();

  // 角丸は外側の黒い枠にだけ付け、動画本体は余白の内側に収める。
  // video 要素に直接 borderRadius を付けると四隅の映像（HUD など）が切り取られるため。
  return (
    <Box sx={{ bgcolor: "#000", borderRadius: 1, p: 1 }}>
      <VideoPlayer
        src={src}
        poster={poster}
        autoPlay={isDesktop}
        onPlay={() => recordView(clipId)}
        onEnded={nextHref ? () => router.push(nextHref) : undefined}
        tags={tags}
      />
    </Box>
  );
}
