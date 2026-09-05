"use client";

// PC 向け視聴ページのプレイヤー枠。
// PC レイアウトが表示されている（md 以上）ときだけ自動再生する。
// スマホでは PC レイアウトごと display:none になり、再生は MobileClipFeed が担当するため、
// この要素が裏で音を鳴らさないよう autoPlay は画面幅で制御する。

import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { VideoPlayer } from "./VideoPlayer";

interface Props {
  src: string;
  poster: string;
}

export function WatchVideo({ src, poster }: Props) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  // 角丸は外側の黒い枠にだけ付け、動画本体は余白の内側に収める。
  // video 要素に直接 borderRadius を付けると四隅の映像（HUD など）が切り取られるため。
  return (
    <Box sx={{ bgcolor: "#000", borderRadius: 1, p: 1 }}>
      <VideoPlayer src={src} poster={poster} autoPlay={isDesktop} />
    </Box>
  );
}
