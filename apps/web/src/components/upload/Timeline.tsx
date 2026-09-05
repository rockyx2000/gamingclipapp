"use client";

// フィルムストリップ上の選択枠で切り出し範囲を決めるタイムライン。
// - 枠の中をドラッグ → 範囲ごと移動
// - 枠の左右のつまみをドラッグ → 開始 / 終了を伸縮
// - ストリップを横スクロール、ピンチや +/- でズーム（長い動画でも細かく選べる）
// フレーム画像は表示中の範囲だけを FrameCache に要求するため、1 時間の動画でも必要な分しか作らない。

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { FrameCache } from "@/lib/video-probe";
import { clampTrim, formatTimecode, type TrimSelection } from "@/lib/video-edit";
import { colors, displaySx } from "@/theme";

interface Props {
  file: File;
  durationSec: number;
  maxSec: number;
  value: TrimSelection;
  onChange: (next: TrimSelection) => void;
  /** プレビューの再生位置（元動画の秒） */
  playhead: number;
  onSeek: (time: number) => void;
}

const STRIP_HEIGHT = 64;
const FRAME_WIDTH = 96;
const MIN_LENGTH_SEC = 1;

type DragMode = "move" | "start" | "end" | "seek";

export function Timeline({
  file,
  durationSec,
  maxSec,
  value,
  onChange,
  playhead,
  onSeek,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ mode: DragMode; grabOffset: number } | null>(null);

  // 1 秒あたりのピクセル数。既定は「選択範囲がだいたい画面に収まる」倍率
  const [pxPerSec, setPxPerSec] = useState(20);
  const [viewport, setViewport] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [, forceRender] = useState(0);

  const cache = useMemo(() => new FrameCache(file, STRIP_HEIGHT), [file]);
  useEffect(() => () => cache.dispose(), [cache]);
  useEffect(() => cache.subscribe(() => forceRender((n) => n + 1)), [cache]);

  const contentWidth = durationSec * pxPerSec;

  // 表示幅を追う
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setViewport(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(el);
    setViewport(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  // 初期倍率: 選択範囲が表示幅の 7 割くらいになるように
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current || viewport === 0) return;
    initialized.current = true;
    const target = (viewport * 0.7) / Math.max(1, value.length);
    setPxPerSec(Math.min(200, Math.max(viewport / durationSec, target)));
  }, [viewport, value.length, durationSec]);

  // 表示中の範囲のフレームを要求する
  const visibleFrames = useMemo(() => {
    if (viewport === 0 || contentWidth === 0) return [];
    const secPerFrame = FRAME_WIDTH / pxPerSec;
    const firstIndex = Math.max(0, Math.floor(scrollLeft / FRAME_WIDTH) - 1);
    const lastIndex = Math.min(
      Math.ceil(contentWidth / FRAME_WIDTH),
      Math.ceil((scrollLeft + viewport) / FRAME_WIDTH) + 1,
    );
    const frames: { index: number; time: number }[] = [];
    for (let i = firstIndex; i < lastIndex; i++) {
      frames.push({ index: i, time: (i + 0.5) * secPerFrame });
    }
    return frames;
  }, [scrollLeft, viewport, contentWidth, pxPerSec]);

  useEffect(() => {
    cache.request(visibleFrames.map((f) => f.time));
  }, [cache, visibleFrames]);

  // 選択範囲が表示外へ出たら追いかける
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || viewport === 0) return;
    const left = value.start * pxPerSec;
    const right = (value.start + value.length) * pxPerSec;
    if (left < el.scrollLeft) {
      el.scrollLeft = Math.max(0, left - 24);
    } else if (right > el.scrollLeft + viewport) {
      el.scrollLeft = right - viewport + 24;
    }
  }, [value.start, value.length, pxPerSec, viewport]);

  const timeFromClientX = useCallback(
    (clientX: number): number => {
      const content = contentRef.current;
      if (!content) return 0;
      const rect = content.getBoundingClientRect();
      return Math.min(durationSec, Math.max(0, (clientX - rect.left) / pxPerSec));
    },
    [durationSec, pxPerSec],
  );

  const update = (next: TrimSelection) => onChange(clampTrim(next, durationSec, maxSec));

  const startDrag = (e: PointerEvent<HTMLDivElement>, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    const t = timeFromClientX(e.clientX);
    dragRef.current = { mode, grabOffset: t - value.start };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (mode === "seek") onSeek(t);
  };

  const moveDrag = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const t = timeFromClientX(e.clientX);
    if (drag.mode === "move") {
      update({ start: t - drag.grabOffset, length: value.length });
    } else if (drag.mode === "start") {
      const end = value.start + value.length;
      const start = Math.min(Math.max(0, t), end - MIN_LENGTH_SEC);
      update({ start, length: Math.min(end - start, maxSec) });
    } else if (drag.mode === "end") {
      const end = Math.max(value.start + MIN_LENGTH_SEC, Math.min(t, durationSec));
      update({ start: value.start, length: end - value.start });
    } else {
      onSeek(t);
    }
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const zoom = (factor: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const centerTime = (el.scrollLeft + viewport / 2) / pxPerSec;
    const minPx = viewport > 0 ? viewport / durationSec : 1;
    const next = Math.min(400, Math.max(minPx, pxPerSec * factor));
    setPxPerSec(next);
    requestAnimationFrame(() => {
      el.scrollLeft = Math.max(0, centerTime * next - viewport / 2);
    });
  };

  const selLeft = value.start * pxPerSec;
  const selWidth = value.length * pxPerSec;
  const end = value.start + value.length;

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          投稿する範囲
        </Typography>
        <Typography component="span" sx={{ ...displaySx, fontSize: 18 }}>
          {formatTimecode(value.start)} - {formatTimecode(end)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ({formatTimecode(value.length)})
        </Typography>
        <Tooltip title="縮小">
          <span>
            <IconButton size="small" onClick={() => zoom(1 / 1.6)} aria-label="縮小">
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="拡大">
          <span>
            <IconButton size="small" onClick={() => zoom(1.6)} aria-label="拡大">
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Box
        ref={scrollRef}
        onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
        sx={{
          overflowX: "auto",
          overflowY: "hidden",
          bgcolor: colors.raised,
          borderRadius: 0.5,
          overscrollBehaviorX: "contain",
        }}
      >
        <Box
          ref={contentRef}
          onPointerDown={(e) => startDrag(e, "seek")}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          sx={{
            position: "relative",
            width: contentWidth,
            height: STRIP_HEIGHT,
            touchAction: "pan-x",
            cursor: "pointer",
          }}
        >
          {/* フィルムストリップ */}
          {visibleFrames.map(({ index, time }) => {
            const url = cache.get(time);
            return (
              <Box
                key={index}
                sx={{
                  position: "absolute",
                  left: index * FRAME_WIDTH,
                  top: 0,
                  width: FRAME_WIDTH,
                  height: "100%",
                  backgroundImage: url ? `url(${url})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.55,
                  pointerEvents: "none",
                }}
              />
            );
          })}

          {/* 選択枠 */}
          <Box
            onPointerDown={(e) => startDrag(e, "move")}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: selLeft,
              width: Math.max(selWidth, 8),
              border: "2px solid #fff",
              borderRadius: 0.5,
              boxSizing: "border-box",
              bgcolor: "rgba(255,255,255,0.12)",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              clipPath: "inset(0)",
              cursor: "grab",
              touchAction: "none",
              "&:active": { cursor: "grabbing" },
            }}
          >
            {/* 左右のつまみ */}
            {(["start", "end"] as const).map((side) => (
              <Box
                key={side}
                onPointerDown={(e) => startDrag(e, side)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                sx={{
                  position: "absolute",
                  top: -2,
                  bottom: -2,
                  [side === "start" ? "left" : "right"]: -8,
                  width: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "ew-resize",
                  touchAction: "none",
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 28,
                    borderRadius: 1,
                    bgcolor: "#fff",
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
                  }}
                />
              </Box>
            ))}
          </Box>

          {/* 再生位置 */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: playhead * pxPerSec,
              width: 2,
              bgcolor: colors.accent,
              pointerEvents: "none",
            }}
          />
        </Box>
      </Box>

      <Stack direction="row" sx={{ justifyContent: "space-between", mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          ドラッグで範囲を移動、両端で長さを調整
        </Typography>
        <Typography variant="caption" color="text.secondary">
          全体 {formatTimecode(durationSec)}
        </Typography>
      </Stack>
    </Box>
  );
}
