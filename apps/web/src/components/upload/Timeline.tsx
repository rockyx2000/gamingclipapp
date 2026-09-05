"use client";

// 動画編集ソフト風のタイムライン。
//   [ルーラー]      目盛りとドラッグでシーク。再生ヘッドのつまみもここ
//   [映像トラック]   フィルムストリップ + 白い選択枠（枠内ドラッグで移動、両端で伸縮）
//   [音声トラック]   追加した BGM の区間を帯で表示。ドラッグで移動、両端で伸縮
//   [テキストトラック] テキストの表示区間を帯で表示。ドラッグで移動、両端で伸縮
// 横スクロールと拡大縮小に対応し、長い動画でも秒単位で合わせられる。
// フレーム画像は表示中の範囲だけを FrameCache に要求する。
//
// 左右には TRACK_PADDING の余白を置く。これが無いと、選択範囲が動画の端まで
// 伸びているとき（1 分以内の動画では既定でそうなる）につまみが画面外に出て掴めない。

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { FrameCache } from "@/lib/video-probe";
import {
  clampTrim,
  formatTimecode,
  MIN_ANNOTATION_SEC,
  MIN_BGM_SEC,
  type BgmTrack,
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
  onAddAnnotation: () => void;
  bgm: BgmTrack | null;
  onPickBgm: (file: File) => void;
  onChangeBgm: (next: BgmTrack) => void;
  onFocusBgm: () => void;
  /** 音声を追加できないブラウザでは音声ボタンを無効にする */
  audioDisabled?: boolean;
}

const RULER_HEIGHT = 22;
const STRIP_HEIGHT = 64;
const BAND_HEIGHT = 24;
const BAND_GAP = 4;
const FRAME_WIDTH = 96;
const MIN_LENGTH_SEC = 1;

/** つまみを掴めるように左右へ空ける余白（px） */
const TRACK_PADDING = 14;

const AUDIO_ACCEPT = "audio/*";

type Drag =
  | { kind: "seek" }
  | { kind: "trim-move"; grabOffset: number }
  | { kind: "trim-start" }
  | { kind: "trim-end" }
  | { kind: "note-move"; id: string; grabOffset: number }
  | { kind: "note-start"; id: string }
  | { kind: "note-end"; id: string }
  | { kind: "bgm-move"; grabOffset: number }
  | { kind: "bgm-start" }
  | { kind: "bgm-end" };

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
  onAddAnnotation,
  bgm,
  onPickBgm,
  onChangeBgm,
  onFocusBgm,
  audioDisabled = false,
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

  const trackWidth = durationSec * pxPerSec;
  const contentWidth = trackWidth + TRACK_PADDING * 2;
  const trimEnd = value.start + value.length;

  /** 時刻（元動画の秒）を content 内の x 座標へ */
  const xOf = useCallback((time: number) => TRACK_PADDING + time * pxPerSec, [pxPerSec]);

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

  /** 全体をちょうど収める倍率。これより縮小してもすき間が増えるだけ */
  const fitPxPerSec = viewport > 0 ? (viewport - TRACK_PADDING * 2) / durationSec : 1;

  // 初期倍率: 選択範囲が表示幅の 7 割くらいになるように
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current || viewport === 0) return;
    initialized.current = true;
    const target = (viewport * 0.7) / Math.max(1, value.length);
    setPxPerSec(Math.min(200, Math.max(fitPxPerSec, target)));
  }, [viewport, value.length, fitPxPerSec]);

  // 表示中の範囲のフレームを要求する。
  // 最後のタイルは動画の終端で切り、ストリップが実際の長さを超えないようにする。
  const visibleFrames = useMemo(() => {
    if (viewport === 0 || trackWidth === 0) return [];
    const from = scrollLeft - TRACK_PADDING;
    const first = Math.max(0, Math.floor(from / FRAME_WIDTH) - 1);
    const last = Math.min(
      Math.ceil(trackWidth / FRAME_WIDTH),
      Math.ceil((from + viewport) / FRAME_WIDTH) + 1,
    );
    const frames: { index: number; left: number; width: number; time: number }[] = [];
    for (let i = first; i < last; i++) {
      const left = i * FRAME_WIDTH;
      const width = Math.min(FRAME_WIDTH, trackWidth - left);
      if (width <= 0) break;
      frames.push({
        index: i,
        left,
        width,
        time: Math.min(durationSec, (left + width / 2) / pxPerSec),
      });
    }
    return frames;
  }, [scrollLeft, viewport, trackWidth, pxPerSec, durationSec]);

  useEffect(() => {
    cache.request(visibleFrames.map((f) => f.time));
  }, [cache, visibleFrames]);

  // 選択範囲が表示外へ出たら追いかける。
  // 行き先は可動域に収め、実際に動く場合だけ書き換える（書き換えの繰り返しを避けるため）。
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || viewport === 0) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = xOf(value.start);
    const right = xOf(trimEnd);
    let target = el.scrollLeft;
    if (left < el.scrollLeft) {
      target = left - TRACK_PADDING;
    } else if (right > el.scrollLeft + viewport) {
      target = right - viewport + TRACK_PADDING;
    }
    target = Math.min(Math.max(0, target), maxScroll);
    if (Math.abs(target - el.scrollLeft) > 1) {
      el.scrollLeft = target;
    }
  }, [value.start, trimEnd, viewport, xOf]);

  const timeFromClientX = useCallback(
    (clientX: number): number => {
      const content = contentRef.current;
      if (!content) return 0;
      const rect = content.getBoundingClientRect();
      const x = clientX - rect.left - TRACK_PADDING;
      return Math.min(durationSec, Math.max(0, x / pxPerSec));
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

    // 帯（BGM とテキスト）はクリップ内の相対秒で持つ
    const rel = Math.min(value.length, Math.max(0, t - value.start));

    if (drag.kind === "bgm-move" || drag.kind === "bgm-start" || drag.kind === "bgm-end") {
      if (!bgm) return;
      if (drag.kind === "bgm-move") {
        const span = bgm.to - bgm.from;
        const from = Math.min(Math.max(0, rel - drag.grabOffset), value.length - span);
        onChangeBgm({ ...bgm, from, to: from + span });
      } else if (drag.kind === "bgm-start") {
        onChangeBgm({ ...bgm, from: Math.min(rel, bgm.to - MIN_BGM_SEC) });
      } else {
        onChangeBgm({ ...bgm, to: Math.max(rel, bgm.from + MIN_BGM_SEC) });
      }
      return;
    }

    const note = annotations.find((a) => a.id === drag.id);
    if (!note) return;
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
    const centerTime = (el.scrollLeft + viewport / 2 - TRACK_PADDING) / pxPerSec;
    const next = Math.min(400, Math.max(fitPxPerSec, pxPerSec * factor));
    setPxPerSec(next);
    requestAnimationFrame(() => {
      el.scrollLeft = Math.max(0, TRACK_PADDING + centerTime * next - viewport / 2);
    });
  };

  const step = tickStep(pxPerSec);
  const ticks: number[] = [];
  for (let t = 0; t <= durationSec; t += step) ticks.push(t);

  const selLeft = xOf(value.start);
  const selWidth = Math.max(value.length * pxPerSec, 8);
  const bandTop = (index: number) =>
    RULER_HEIGHT + STRIP_HEIGHT + BAND_GAP + index * (BAND_HEIGHT + BAND_GAP);
  const bandCount = (bgm ? 1 : 0) + annotations.length;
  const tracksHeight =
    RULER_HEIGHT +
    STRIP_HEIGHT +
    (bandCount > 0 ? bandCount * (BAND_HEIGHT + BAND_GAP) + BAND_GAP : 0);

  /** 帯（BGM / テキスト）の共通の見た目 */
  const bandSx = (index: number, left: number, width: number, selected: boolean) =>
    ({
      position: "absolute" as const,
      top: bandTop(index),
      left,
      width,
      height: BAND_HEIGHT,
      bgcolor: selected ? colors.accent : colors.raised,
      color: selected ? colors.onAccent : colors.text,
      border: `1px solid ${selected ? colors.accent : colors.borderStrong}`,
      borderRadius: 0.5,
      boxSizing: "border-box" as const,
      display: "flex",
      alignItems: "center",
      gap: 0.5,
      px: 1,
      overflow: "hidden",
      cursor: "grab",
      touchAction: "none",
      "&:active": { cursor: "grabbing" },
    }) as const;

  /** 帯の両端に置く伸縮つまみ */
  const bandHandle = (kind: Drag["kind"], drag: Drag, selected: boolean) => (
    <Box
      key={kind}
      onPointerDown={(e) => beginDrag(e, drag)}
      sx={{
        position: "absolute",
        top: 0,
        bottom: 0,
        [kind.endsWith("start") ? "left" : "right"]: 0,
        width: 8,
        cursor: "ew-resize",
        touchAction: "none",
        bgcolor: selected ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.18)",
      }}
    />
  );

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1, mb: 1 }}
      >
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          投稿する範囲
        </Typography>

        <Button size="small" startIcon={<TextFieldsIcon />} onClick={onAddAnnotation}>
          テキスト追加
        </Button>
        <Tooltip
          title={audioDisabled ? "このブラウザでは BGM を追加できません" : "BGM を追加"}
        >
          <span>
            <Button
              component="label"
              size="small"
              startIcon={<LibraryMusicIcon />}
              disabled={audioDisabled}
            >
              音声追加
              <input
                type="file"
                accept={AUDIO_ACCEPT}
                hidden
                disabled={audioDisabled}
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  if (picked) onPickBgm(picked);
                  e.target.value = "";
                }}
              />
            </Button>
          </span>
        </Tooltip>

        <Typography component="span" sx={{ ...displaySx, fontSize: 18, ml: 1 }}>
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
                  left: xOf(t),
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
              left: TRACK_PADDING,
              width: trackWidth,
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
                width: value.start * pxPerSec,
                bgcolor: "rgba(15,17,20,0.72)",
                pointerEvents: "none",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: trimEnd * pxPerSec,
                right: 0,
                bgcolor: "rgba(15,17,20,0.72)",
                pointerEvents: "none",
              }}
            />
          </Box>

          {/* 選択枠。つまみが端で切れないよう、余白を含む層に置く */}
          <Box
            onPointerDown={(e) =>
              beginDrag(e, {
                kind: "trim-move",
                grabOffset: timeFromClientX(e.clientX) - value.start,
              })
            }
            sx={{
              position: "absolute",
              top: RULER_HEIGHT,
              height: STRIP_HEIGHT,
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

          {/* 音声トラック */}
          {bgm && (
            <Box
              onPointerDown={(e) => {
                onFocusBgm();
                beginDrag(e, {
                  kind: "bgm-move",
                  grabOffset:
                    Math.min(value.length, Math.max(0, timeFromClientX(e.clientX) - value.start)) -
                    bgm.from,
                });
              }}
              sx={bandSx(
                0,
                xOf(value.start + bgm.from),
                Math.max((bgm.to - bgm.from) * pxPerSec, 12),
                false,
              )}
            >
              <LibraryMusicIcon sx={{ fontSize: 14, pointerEvents: "none", flexShrink: 0 }} />
              <Typography variant="caption" noWrap sx={{ fontWeight: 600, pointerEvents: "none" }}>
                {bgm.name}
              </Typography>
              {bandHandle("bgm-start", { kind: "bgm-start" }, false)}
              {bandHandle("bgm-end", { kind: "bgm-end" }, false)}
            </Box>
          )}

          {/* テキストトラック */}
          {annotations.map((note, i) => {
            const from = note.from ?? 0;
            const to = note.to ?? value.length;
            const selected = note.id === selectedAnnotationId;
            return (
              <Box
                key={note.id}
                onPointerDown={(e) => {
                  onSelectAnnotation(note.id);
                  beginDrag(e, {
                    kind: "note-move",
                    id: note.id,
                    grabOffset:
                      Math.min(
                        value.length,
                        Math.max(0, timeFromClientX(e.clientX) - value.start),
                      ) - from,
                  });
                }}
                sx={bandSx(
                  (bgm ? 1 : 0) + i,
                  xOf(value.start + from),
                  Math.max((to - from) * pxPerSec, 12),
                  selected,
                )}
              >
                <Typography variant="caption" noWrap sx={{ fontWeight: 600, pointerEvents: "none" }}>
                  {note.text || "テキスト"}
                </Typography>
                {bandHandle("note-start", { kind: "note-start", id: note.id }, selected)}
                {bandHandle("note-end", { kind: "note-end", id: note.id }, selected)}
              </Box>
            );
          })}

          {/* 再生ヘッド: つまみをドラッグして動かせる */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: xOf(playhead),
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
              left: xOf(playhead),
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
