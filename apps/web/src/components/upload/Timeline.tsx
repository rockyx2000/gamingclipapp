"use client";

// 動画編集ソフト風のタイムライン。
//   [ルーラー]      目盛りとドラッグでシーク。再生ヘッドのつまみもここ
//   [映像トラック]   フィルムストリップ + 白い選択枠（枠内ドラッグで移動、両端で伸縮）
//   [テキストトラック] テキストの表示区間を帯で表示。ドラッグで移動、両端で伸縮
// 横スクロールと拡大縮小に対応し、長い動画でも秒単位で合わせられる。
// フレーム画像は表示中の範囲だけを FrameCache に要求する。

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { FrameCache } from "@/lib/video-probe";
import {
  clampTrim,
  formatTimecode,
  MIN_ANNOTATION_SEC,
  type TextAnnotation,
  type TrimSelection,
} from "@/lib/video-edit";
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
  annotations: TextAnnotation[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onChangeAnnotation: (next: TextAnnotation) => void;
}

const RULER_HEIGHT = 22;
const STRIP_HEIGHT = 64;
const ANNOTATION_HEIGHT = 24;
const ANNOTATION_GAP = 4;
const FRAME_WIDTH = 96;
const MIN_LENGTH_SEC = 1;

type Drag =
  | { kind: "seek" }
  | { kind: "trim-move"; grabOffset: number }
  | { kind: "trim-start" }
  | { kind: "trim-end" }
  | { kind: "note-move"; id: string; grabOffset: number }
  | { kind: "note-start"; id: string }
  | { kind: "note-end"; id: string };

/** 目盛りの間隔（秒）。表示倍率に応じて見やすい値を選ぶ */
function tickStep(pxPerSec: number): number {
  const candidates = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  return candidates.find((c) => c * pxPerSec >= 64) ?? 900;
}

export function Timeline({
  file,
  durationSec,
  maxSec,
  value,
  onChange,
  playhead,
  onSeek,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onChangeAnnotation,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const scrollFrameRef = useRef(0);

  const [pxPerSec, setPxPerSec] = useState(20);
  const [viewport, setViewport] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [, forceRender] = useState(0);

  const cache = useMemo(() => new FrameCache(file, STRIP_HEIGHT), [file]);
  useEffect(() => () => cache.dispose(), [cache]);
  useEffect(() => cache.subscribe(() => forceRender((n) => n + 1)), [cache]);

  const contentWidth = durationSec * pxPerSec;
  const trimEnd = value.start + value.length;

  // スクロール位置は描画フレームごとにまとめて反映する。
  // scrollLeft を書き換えるたびに state を更新すると、追従処理との間で往復し続けてしまう。
  const handleScroll = useCallback(() => {
    if (scrollFrameRef.current) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = 0;
      const next = scrollRef.current?.scrollLeft ?? 0;
      setScrollLeft((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    });
  }, []);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    };
  }, []);

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

  // 表示中の範囲のフレームを要求する。
  // 最後のタイルは動画の終端で切り、ストリップが実際の長さを超えないようにする。
  const visibleFrames = useMemo(() => {
    if (viewport === 0 || contentWidth === 0) return [];
    const first = Math.max(0, Math.floor(scrollLeft / FRAME_WIDTH) - 1);
    const last = Math.min(
      Math.ceil(contentWidth / FRAME_WIDTH),
      Math.ceil((scrollLeft + viewport) / FRAME_WIDTH) + 1,
    );
    const frames: { index: number; left: number; width: number; time: number }[] = [];
    for (let i = first; i < last; i++) {
      const left = i * FRAME_WIDTH;
      const width = Math.min(FRAME_WIDTH, contentWidth - left);
      if (width <= 0) break;
      frames.push({
        index: i,
        left,
        width,
        time: Math.min(durationSec, (left + width / 2) / pxPerSec),
      });
    }
    return frames;
  }, [scrollLeft, viewport, contentWidth, pxPerSec, durationSec]);

  useEffect(() => {
    cache.request(visibleFrames.map((f) => f.time));
  }, [cache, visibleFrames]);

  // 選択範囲が表示外へ出たら追いかける。
  // 行き先は可動域に収め、実際に動く場合だけ書き換える（書き換えの繰り返しを避けるため）。
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || viewport === 0) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = value.start * pxPerSec;
    const right = trimEnd * pxPerSec;
    let target = el.scrollLeft;
    if (left < el.scrollLeft) {
      target = left - 24;
    } else if (right > el.scrollLeft + viewport) {
      target = right - viewport + 24;
    }
    target = Math.min(Math.max(0, target), maxScroll);
    if (Math.abs(target - el.scrollLeft) > 1) {
      el.scrollLeft = target;
    }
  }, [value.start, trimEnd, pxPerSec, viewport]);

  const timeFromClientX = useCallback(
    (clientX: number): number => {
      const content = contentRef.current;
      if (!content) return 0;
      const rect = content.getBoundingClientRect();
      return Math.min(durationSec, Math.max(0, (clientX - rect.left) / pxPerSec));
    },
    [durationSec, pxPerSec],
  );

  const beginDrag = (e: PointerEvent<HTMLElement>, drag: Drag) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = drag;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (drag.kind === "seek") onSeek(timeFromClientX(e.clientX));
  };

  const moveDrag = (e: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const t = timeFromClientX(e.clientX);

    if (drag.kind === "seek") {
      onSeek(t);
      return;
    }
    if (drag.kind === "trim-move") {
      onChange(clampTrim({ start: t - drag.grabOffset, length: value.length }, durationSec, maxSec));
      return;
    }
    if (drag.kind === "trim-start") {
      const start = Math.min(Math.max(0, t), trimEnd - MIN_LENGTH_SEC);
      onChange(clampTrim({ start, length: Math.min(trimEnd - start, maxSec) }, durationSec, maxSec));
      return;
    }
    if (drag.kind === "trim-end") {
      const end = Math.max(value.start + MIN_LENGTH_SEC, Math.min(t, durationSec));
      onChange(clampTrim({ start: value.start, length: end - value.start }, durationSec, maxSec));
      return;
    }

    // テキストの帯。from / to はクリップ内の相対秒で保持する
    const note = annotations.find((a) => a.id === drag.id);
    if (!note) return;
    const rel = Math.min(value.length, Math.max(0, t - value.start));
    const from = note.from ?? 0;
    const to = note.to ?? value.length;

    if (drag.kind === "note-move") {
      const span = to - from;
      const nextFrom = Math.min(Math.max(0, rel - drag.grabOffset), value.length - span);
      onChangeAnnotation({ ...note, from: nextFrom, to: nextFrom + span });
    } else if (drag.kind === "note-start") {
      onChangeAnnotation({ ...note, from: Math.min(rel, to - MIN_ANNOTATION_SEC), to });
    } else {
      onChangeAnnotation({ ...note, from, to: Math.max(rel, from + MIN_ANNOTATION_SEC) });
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

  const step = tickStep(pxPerSec);
  const ticks: number[] = [];
  for (let t = 0; t <= durationSec; t += step) ticks.push(t);

  const selLeft = value.start * pxPerSec;
  const selWidth = Math.max(value.length * pxPerSec, 8);
  const tracksHeight =
    RULER_HEIGHT +
    STRIP_HEIGHT +
    (annotations.length > 0
      ? annotations.length * (ANNOTATION_HEIGHT + ANNOTATION_GAP) + ANNOTATION_GAP
      : 0);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          投稿する範囲
        </Typography>
        <Typography component="span" sx={{ ...displaySx, fontSize: 18 }}>
          {formatTimecode(value.start)} - {formatTimecode(trimEnd)}
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
        onScroll={handleScroll}
        sx={{
          overflowX: "auto",
          overflowY: "hidden",
          bgcolor: colors.surface,
          borderRadius: 0.5,
          border: `1px solid ${colors.border}`,
          overscrollBehaviorX: "contain",
        }}
      >
        <Box
          ref={contentRef}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          sx={{ position: "relative", width: contentWidth, height: tracksHeight }}
        >
          {/* ルーラー: ドラッグでシーク */}
          <Box
            onPointerDown={(e) => beginDrag(e, { kind: "seek" })}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: RULER_HEIGHT,
              bgcolor: colors.bg,
              borderBottom: `1px solid ${colors.border}`,
              cursor: "col-resize",
              touchAction: "none",
            }}
          >
            {ticks.map((t) => (
              <Box
                key={t}
                sx={{
                  position: "absolute",
                  left: t * pxPerSec,
                  top: 0,
                  bottom: 0,
                  borderLeft: `1px solid ${colors.borderStrong}`,
                  pl: 0.5,
                  pointerEvents: "none",
                }}
              >
                <Typography
                  component="span"
                  sx={{ ...displaySx, fontSize: 11, color: colors.muted, lineHeight: `${RULER_HEIGHT}px` }}
                >
                  {formatTimecode(t).replace(".0", "")}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* 映像トラック */}
          <Box
            sx={{
              position: "absolute",
              top: RULER_HEIGHT,
              left: 0,
              width: "100%",
              height: STRIP_HEIGHT,
              bgcolor: colors.raised,
            }}
          >
            {visibleFrames.map(({ index, left, width, time }) => {
              const url = cache.get(time);
              return (
                <Box
                  key={index}
                  sx={{
                    position: "absolute",
                    left,
                    top: 0,
                    width,
                    height: "100%",
                    backgroundImage: url ? `url(${url})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    pointerEvents: "none",
                  }}
                />
              );
            })}

            {/* 選択範囲の外を暗くする */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: selLeft,
                bgcolor: "rgba(15,17,20,0.72)",
                pointerEvents: "none",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: selLeft + selWidth,
                right: 0,
                bgcolor: "rgba(15,17,20,0.72)",
                pointerEvents: "none",
              }}
            />

            {/* 選択枠 */}
            <Box
              onPointerDown={(e) =>
                beginDrag(e, {
                  kind: "trim-move",
                  grabOffset: timeFromClientX(e.clientX) - value.start,
                })
              }
              sx={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: selLeft,
                width: selWidth,
                border: "2px solid #fff",
                borderRadius: 0.5,
                boxSizing: "border-box",
                cursor: "grab",
                touchAction: "none",
                "&:active": { cursor: "grabbing" },
              }}
            >
              {(["trim-start", "trim-end"] as const).map((kind) => (
                <Box
                  key={kind}
                  onPointerDown={(e) => beginDrag(e, { kind })}
                  sx={{
                    position: "absolute",
                    top: -2,
                    bottom: -2,
                    [kind === "trim-start" ? "left" : "right"]: -9,
                    width: 18,
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
                      height: 30,
                      borderRadius: 1,
                      bgcolor: "#fff",
                      boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>

          {/* テキストトラック */}
          {annotations.map((note, i) => {
            const from = note.from ?? 0;
            const to = note.to ?? value.length;
            const left = (value.start + from) * pxPerSec;
            const width = Math.max((to - from) * pxPerSec, 12);
            const selected = note.id === selectedAnnotationId;
            return (
              <Box
                key={note.id}
                onPointerDown={(e) => {
                  onSelectAnnotation(note.id);
                  beginDrag(e, { kind: "note-move", id: note.id, grabOffset: 
                    Math.min(value.length, Math.max(0, timeFromClientX(e.clientX) - value.start)) - from });
                }}
                sx={{
                  position: "absolute",
                  top: RULER_HEIGHT + STRIP_HEIGHT + ANNOTATION_GAP + i * (ANNOTATION_HEIGHT + ANNOTATION_GAP),
                  left,
                  width,
                  height: ANNOTATION_HEIGHT,
                  bgcolor: selected ? colors.accent : colors.raised,
                  color: selected ? colors.onAccent : colors.text,
                  border: `1px solid ${selected ? colors.accent : colors.borderStrong}`,
                  borderRadius: 0.5,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  px: 1,
                  overflow: "hidden",
                  cursor: "grab",
                  touchAction: "none",
                  "&:active": { cursor: "grabbing" },
                }}
              >
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ fontWeight: 600, pointerEvents: "none" }}
                >
                  {note.text || "テキスト"}
                </Typography>
                {(["note-start", "note-end"] as const).map((kind) => (
                  <Box
                    key={kind}
                    onPointerDown={(e) => beginDrag(e, { kind, id: note.id })}
                    sx={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      [kind === "note-start" ? "left" : "right"]: 0,
                      width: 8,
                      cursor: "ew-resize",
                      touchAction: "none",
                      bgcolor: selected ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.18)",
                    }}
                  />
                ))}
              </Box>
            );
          })}

          {/* 再生ヘッド: つまみをドラッグして動かせる */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: playhead * pxPerSec,
              width: 2,
              bgcolor: colors.accent,
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
          <Box
            onPointerDown={(e) => beginDrag(e, { kind: "seek" })}
            sx={{
              position: "absolute",
              top: 0,
              left: playhead * pxPerSec,
              transform: "translateX(-50%)",
              width: 16,
              height: RULER_HEIGHT,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              cursor: "col-resize",
              touchAction: "none",
              zIndex: 3,
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                bgcolor: colors.accent,
                borderRadius: "2px 2px 6px 6px",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
              }}
            />
          </Box>
        </Box>
      </Box>

      <Stack direction="row" sx={{ justifyContent: "space-between", mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          白い枠をドラッグで範囲移動、両端で長さ調整。上の目盛りをドラッグで再生位置を移動
        </Typography>
        <Typography variant="caption" color="text.secondary">
          全体 {formatTimecode(durationSec)}
        </Typography>
      </Stack>
    </Box>
  );
}
