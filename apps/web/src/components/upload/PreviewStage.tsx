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
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
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

// 編集中は同じ範囲を繰り返し再生するため、既定を控えめにする。
// 選んだ音量はブラウザに覚えさせ、次の投稿でも同じ大きさから始める。
const VOLUME_STORAGE_KEY = "gca_editor_volume";
const DEFAULT_VOLUME = 0.4;

function loadStoredVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw === null) return DEFAULT_VOLUME;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

function storeVolume(volume: number): void {
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
  } catch {
    // 保存できなくても再生には影響しない
  }
}

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
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [muted, setMuted] = useState(false);
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

  // 前回選んだ音量を読み出す（localStorage はサーバー側に無いのでマウント後に行う）
  const volumeLoaded = useRef(false);
  useEffect(() => {
    if (volumeLoaded.current) return;
    volumeLoaded.current = true;
    const stored = loadStoredVolume();
    setVolume(stored);
    setMuted(stored === 0);
  }, []);

  // 音量を video 要素へ反映する
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted || volume === 0;
  }, [volume, muted]);

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

  const changeVolume = (next: number) => {
    setVolume(next);
    setMuted(next === 0);
    storeVolume(next);
  };

  const toggleMute = () => {
    if (muted || volume === 0) {
      const restored = volume === 0 ? DEFAULT_VOLUME : volume;
      setVolume(restored);
      setMuted(false);
      storeVolume(restored);
    } else {
      setMuted(true);
    }
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
  const silent = muted || volume === 0;
  const VolumeIcon = silent ? VolumeOffIcon : volume < 0.5 ? VolumeDownIcon : VolumeUpIcon;

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

        {/* 再生ボタン・時刻・音量 */}
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

          {/* 音量: ホバーでスライダーが伸びる */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              ml: 0.5,
              "&:hover .volume-slider, &:focus-within .volume-slider": {
                width: 72,
                opacity: 1,
                ml: 1,
              },
            }}
          >
            <IconButton
              size="small"
              onClick={toggleMute}
              sx={{ color: "#fff" }}
              aria-label={silent ? "ミュート解除" : "ミュート"}
            >
              <VolumeIcon fontSize="small" />
            </IconButton>
            <Slider
              className="volume-slider"
              aria-label="音量"
              size="small"
              min={0}
              max={1}
              step={0.05}
              value={silent ? 0 : volume}
              onChange={(_, v) => changeVolume(Array.isArray(v) ? v[0] : v)}
              sx={{
                width: 0,
                opacity: 0,
                ml: 0,
                overflow: "hidden",
                transition: "width 0.2s, opacity 0.2s, margin 0.2s",
                color: "#fff",
                "& .MuiSlider-rail": { opacity: 0.3 },
                "& .MuiSlider-thumb": {
                  width: 10,
                  height: 10,
                  boxShadow: "0 0 0 2px rgba(0,0,0,0.6)",
                  "&::before": { display: "none" },
                },
              }}
            />
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
