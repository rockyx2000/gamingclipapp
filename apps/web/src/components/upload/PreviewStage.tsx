"use client";

// 編集中のプレビュー。動画に CSS フィルターを掛け、テキストを DOM で重ねる。
// テキストはドラッグで位置を変えられる。再生は選択範囲内をループする。

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
  ANNOTATION_FONT,
  cssFilter,
  formatTimecode,
  isAnnotationVisible,
  type FilterSettings,
  type TextAnnotation,
  type TrimSelection,
} from "@/lib/video-edit";
import { displaySx } from "@/theme";

export interface PreviewStageHandle {
  /** 元動画の秒で移動する */
  seek: (time: number) => void;
}

interface Props {
  ref?: Ref<PreviewStageHandle>;
  previewUrl: string;
  /** 動画の幅 / 高さ */
  aspect: number;
  trim: TrimSelection;
  filters: FilterSettings;
  annotations: TextAnnotation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMoveAnnotation: (id: string, x: number, y: number) => void;
  /** 再生位置（元動画の秒） */
  onTimeChange: (time: number) => void;
}

const MAX_STAGE_HEIGHT = 440;

export function PreviewStage({
  ref,
  previewUrl,
  aspect,
  trim,
  filters,
  annotations,
  selectedId,
  onSelect,
  onMoveAnnotation,
  onTimeChange,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(trim.start);
  const [stageHeight, setStageHeight] = useState(0);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const end = trim.start + trim.length;

  useImperativeHandle(ref, () => ({
    seek: (t: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = t;
    },
  }));

  // 文字サイズを動画の高さに対する割合で決めるため、表示サイズを追う
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0;
      setStageHeight(h);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 選択範囲が変わったら開始位置へ
  useEffect(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 1) return;
    if (video.currentTime < trim.start || video.currentTime > end) {
      video.currentTime = trim.start;
    }
  }, [trim.start, end]);

  const reportTime = (t: number) => {
    setTime(t);
    onTimeChange(t);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime < trim.start || video.currentTime >= end - 0.05) {
        video.currentTime = trim.start;
      }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused && video.currentTime >= end) {
      video.currentTime = trim.start;
    }
    reportTime(video.currentTime);
  };

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>, a: TextAnnotation) => {
    e.stopPropagation();
    onSelect(a.id);
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    dragRef.current = {
      id: a.id,
      offsetX: (e.clientX - rect.left) / rect.width - a.x,
      offsetY: (e.clientY - rect.top) / rect.height - a.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;
    const rect = stage.getBoundingClientRect();
    const x = Math.min(0.98, Math.max(0.02, (e.clientX - rect.left) / rect.width - drag.offsetX));
    const y = Math.min(0.98, Math.max(0.02, (e.clientY - rect.top) / rect.height - drag.offsetY));
    onMoveAnnotation(drag.id, x, y);
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const relTime = time - trim.start;

  return (
    <Box sx={{ bgcolor: "#000", borderRadius: 1, p: 1 }}>
      <Box
        ref={stageRef}
        onClick={() => onSelect(null)}
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: `${Math.round(MAX_STAGE_HEIGHT * aspect)}px`,
          mx: "auto",
          aspectRatio: String(aspect),
          bgcolor: "#000",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        <Box
          component="video"
          ref={videoRef}
          src={previewUrl}
          playsInline
          preload="metadata"
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          onContextMenu={(e: ReactMouseEvent) => e.preventDefault()}
          onLoadedMetadata={() => {
            const video = videoRef.current;
            if (video) video.currentTime = trim.start;
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onSeeked={handleTimeUpdate}
          onTimeUpdate={handleTimeUpdate}
          onClick={(e: ReactMouseEvent) => {
            e.stopPropagation();
            onSelect(null);
            togglePlay();
          }}
          style={{ filter: cssFilter(filters) }}
          sx={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "contain",
            cursor: "pointer",
          }}
        />

        {/* テキストの重ね書き */}
        {annotations
          .filter((a) => isAnnotationVisible(a, relTime))
          .map((a) => {
            const fontPx = Math.max(6, a.size * stageHeight);
            return (
              <Box
                key={a.id}
                onPointerDown={(e) => startDrag(e, a)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClick={(e) => e.stopPropagation()}
                sx={{
                  position: "absolute",
                  left: `${a.x * 100}%`,
                  top: `${a.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                  fontFamily: ANNOTATION_FONT,
                  fontWeight: 700,
                  fontSize: fontPx,
                  lineHeight: 1.3,
                  color: a.color,
                  whiteSpace: "pre",
                  textAlign: "center",
                  cursor: "move",
                  touchAction: "none",
                  px: a.background ? `${fontPx * 0.4}px` : 0,
                  py: a.background ? `${fontPx * 0.2}px` : 0,
                  bgcolor: a.background ? "rgba(0,0,0,0.55)" : "transparent",
                  WebkitTextStroke: a.background
                    ? "0"
                    : `${fontPx * 0.06}px ${a.color === "#111111" ? "#ffffff" : "#000000"}`,
                  paintOrder: "stroke fill",
                  outline: a.id === selectedId ? "2px dashed rgba(255,255,255,0.9)" : "none",
                  outlineOffset: 4,
                }}
              >
                {a.text || "テキスト"}
              </Box>
            );
          })}

        {/* 再生ボタンと時刻 */}
        <Stack
          direction="row"
          spacing={1}
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: "absolute",
            left: 8,
            bottom: 8,
            alignItems: "center",
            color: "#fff",
            bgcolor: "rgba(0,0,0,0.6)",
            borderRadius: 0.5,
            pr: 1.5,
          }}
        >
          <IconButton
            size="small"
            onClick={togglePlay}
            sx={{ color: "#fff" }}
            aria-label={playing ? "一時停止" : "選択範囲を再生"}
          >
            {playing ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <Typography component="span" sx={{ ...displaySx, fontWeight: 600, fontSize: 15 }}>
            {formatTimecode(Math.max(0, relTime))} / {formatTimecode(trim.length)}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
