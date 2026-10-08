"use client";

// サムネイルにマウスを乗せると、動画の最初の 5 秒を（無音で）再生する。
// 少し待ってから動画を読み込み、再生が始まったらサムネイルと入れ替える。
// 5 秒たつ（または再生に失敗する）とサムネイルに戻り、外してもう一度乗せると、また頭から再生する。
// マウスのない端末（hover: hover でない）と、動きを減らす設定（prefers-reduced-motion）では動かさない。

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Box, { type BoxProps } from "@mui/material/Box";

/** 乗せてから動画を読み込み始めるまでの待ち。通り過ぎただけで通信しないため */
const HOVER_DELAY_MS = 350;
/** 再生する長さ（秒） */
export const PREVIEW_SECONDS = 5;

function PreviewVideo({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  if (done) return null;
  return (
    <video
      src={src}
      muted
      playsInline
      autoPlay
      preload="auto"
      aria-hidden
      tabIndex={-1}
      disablePictureInPicture
      controlsList="nodownload"
      onPlaying={() => setPlaying(true)}
      onTimeUpdate={(e) => {
        if (e.currentTarget.currentTime >= PREVIEW_SECONDS) {
          e.currentTarget.pause();
          setDone(true);
        }
      }}
      onEnded={() => setDone(true)}
      onError={() => setDone(true)}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        // 再生が始まるまでは透明にして、サムネイルが一瞬消えるのを防ぐ
        opacity: playing ? 1 : 0,
        transition: "opacity 120ms",
        pointerEvents: "none",
      }}
    />
  );
}

interface Props extends Omit<BoxProps, "children"> {
  /** 再生する動画の URL */
  src: string;
  /** サムネイル画像の URL */
  poster: string;
  /** 再生時間などのバッジ。動画の上に重なる */
  children?: ReactNode;
}

export function HoverPreview({ src, poster, sx, children, ...rest }: Props) {
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const enter = useCallback(() => {
    if (
      !window.matchMedia("(hover: hover)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setActive(true), HOVER_DELAY_MS);
  }, []);

  const leave = useCallback(() => {
    clearTimeout(timer.current);
    setActive(false);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <Box
      {...rest}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      sx={{
        position: "relative",
        overflow: "hidden",
        bgcolor: "#000",
        backgroundImage: `url(${poster})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        ...sx,
      }}
    >
      {active && <PreviewVideo src={src} />}
      {children}
    </Box>
  );
}
