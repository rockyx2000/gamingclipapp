"use client";

// 自前コントロールの動画プレイヤー（PC 視聴ページ用）
// ブラウザ標準のコントロールは使わない（ダウンロードボタンが出るため）。
// 右クリックメニューとピクチャインピクチャも無効化する。
// 注意: これは UI 上の抑止であり、URL を知っていれば取得自体は可能。
// 本当に防ぐには署名付き URL の短命化や DRM が必要（docs/architecture.md）。

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ReplayIcon from "@mui/icons-material/Replay";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { formatDuration } from "@/lib/format";
import { displaySx } from "@/theme";

interface Props {
  src: string;
  poster?: string;
  /** true のとき自動再生を試みる */
  autoPlay?: boolean;
}

const HIDE_CONTROLS_MS = 2500;
const SEEK_STEP_SEC = 5;

export function VideoPlayer({ src, poster, autoPlay = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [seeking, setSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  // 自動再生（PC レイアウト表示時のみ true が渡される）
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (autoPlay) {
      video.play().catch(() => {
        // 自動再生がブロックされた場合はユーザー操作を待つ
      });
    } else {
      video.pause();
    }
  }, [autoPlay, src]);

  // フルスクリーン状態を追従する
  useEffect(() => {
    const onChange = () =>
      setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  // 操作があったらコントロールを表示し、再生中なら一定時間後に隠す
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false);
      }
    }, HIDE_CONTROLS_MS);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    showControls();
  }, [showControls]);

  const seekBy = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = Math.min(
        Math.max(0, video.currentTime + delta),
        video.duration || 0,
      );
      showControls();
    },
    [showControls],
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    showControls();
  }, [showControls]);

  const changeVolume = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      container.requestFullscreen().catch(() => {});
    }
    showControls();
  }, [showControls]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case " ":
      case "k":
        togglePlay();
        break;
      case "ArrowLeft":
        seekBy(-SEEK_STEP_SEC);
        break;
      case "ArrowRight":
        seekBy(SEEK_STEP_SEC);
        break;
      case "ArrowUp":
        changeVolume(Math.min(1, volume + 0.1));
        break;
      case "ArrowDown":
        changeVolume(Math.max(0, volume - 0.1));
        break;
      case "m":
        toggleMute();
        break;
      case "f":
        toggleFullscreen();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const handleProgress = (e: SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }
  };

  const handleSeekChange = (_: Event, value: number | number[]) => {
    const video = videoRef.current;
    const next = Array.isArray(value) ? value[0] : value;
    if (!video) return;
    setSeeking(true);
    setSeekValue(next);
    video.currentTime = next;
    showControls();
  };

  const handleSeekCommitted = () => {
    setSeeking(false);
  };

  const displayTime = seeking ? seekValue : currentTime;
  const VolumeIcon =
    muted || volume === 0
      ? VolumeOffIcon
      : volume < 0.5
        ? VolumeDownIcon
        : VolumeUpIcon;

  return (
    <Box
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={showControls}
      onMouseLeave={() => {
        if (playing) setControlsVisible(false);
      }}
      onContextMenu={(e) => e.preventDefault()}
      sx={{
        position: "relative",
        bgcolor: "#000",
        outline: "none",
        cursor: controlsVisible ? "default" : "none",
        "&:focus-visible": { boxShadow: "0 0 0 2px rgba(233,30,99,0.6)" },
        "&:fullscreen": {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        "&:fullscreen video": {
          width: "100%",
          height: "100%",
          maxHeight: "none",
          aspectRatio: "auto",
        },
      }}
    >
      <Box
        component="video"
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onPlay={() => {
          setPlaying(true);
          setEnded(false);
          showControls();
        }}
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
        }}
        onEnded={() => {
          setEnded(true);
          setControlsVisible(true);
        }}
        onTimeUpdate={(e: SyntheticEvent<HTMLVideoElement>) => {
          if (!seeking) setCurrentTime(e.currentTarget.currentTime);
        }}
        onLoadedMetadata={(e: SyntheticEvent<HTMLVideoElement>) =>
          setDuration(e.currentTarget.duration)
        }
        onProgress={handleProgress}
        onVolumeChange={(e: SyntheticEvent<HTMLVideoElement>) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
        }}
        sx={{
          display: "block",
          width: "100%",
          aspectRatio: "16 / 9",
          maxHeight: "70vh",
          objectFit: "contain",
          bgcolor: "#000",
        }}
      />

      {/* 中央の再生 / リプレイ */}
      {(!playing || ended) && (
        <Box
          onClick={togglePlay}
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.92)",
              color: "#111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.55)",
              transition: "transform 0.15s, background-color 0.15s",
              "&:hover": { transform: "scale(1.06)", bgcolor: "#fff" },
            }}
          >
            {ended ? (
              <ReplayIcon sx={{ fontSize: 40 }} />
            ) : (
              <PlayArrowIcon sx={{ fontSize: 44, ml: 0.5 }} />
            )}
          </Box>
        </Box>
      )}

      {/* 下部コントロール */}
      <Box
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          px: 1.5,
          pb: 0.5,
          pt: 5,
          color: "#fff",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0) 100%)",
          opacity: controlsVisible ? 1 : 0,
          transition: "opacity 0.2s",
          pointerEvents: controlsVisible ? "auto" : "none",
        }}
      >
        {/* シークバー: バッファ済み範囲の上にグラデーションの再生位置を重ねる */}
        <Box sx={{ position: "relative", height: 20 }}>
          <Box
            sx={{
              position: "absolute",
              left: 0,
              top: 8,
              height: 4,
              width: duration ? `${(buffered / duration) * 100}%` : 0,
              bgcolor: "rgba(255,255,255,0.35)",
              borderRadius: 2,
              pointerEvents: "none",
            }}
          />
          <Slider
            aria-label="再生位置"
            size="small"
            min={0}
            max={duration || 0}
            step={0.1}
            value={displayTime}
            onChange={handleSeekChange}
            onChangeCommitted={handleSeekCommitted}
            sx={{
              position: "absolute",
              inset: 0,
              py: "8px",
              color: "#fff",
              "& .MuiSlider-rail": { height: 4, opacity: 0.25 },
              "& .MuiSlider-track": {
                height: 4,
                border: "none",
                bgcolor: "#fff",
              },
              "& .MuiSlider-thumb": {
                width: 14,
                height: 14,
                bgcolor: "#fff",
                boxShadow: "0 0 0 2px rgba(0,0,0,0.6)",
                transition: "transform 0.15s, box-shadow 0.15s",
                transform: "translate(-50%, -50%) scale(0)",
                "&::before": { display: "none" },
                "&:hover, &.Mui-focusVisible, &.Mui-active": {
                  boxShadow:
                    "0 0 0 2px rgba(0,0,0,0.6), 0 0 0 8px rgba(255,255,255,0.2)",
                },
              },
              "&:hover .MuiSlider-thumb, & .MuiSlider-thumb.Mui-active, & .MuiSlider-thumb.Mui-focusVisible":
                {
                  transform: "translate(-50%, -50%) scale(1)",
                },
            }}
          />
        </Box>

        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <IconButton
            onClick={togglePlay}
            size="small"
            sx={{ color: "#fff" }}
            aria-label={playing ? "一時停止" : "再生"}
          >
            {ended ? (
              <ReplayIcon />
            ) : playing ? (
              <PauseIcon />
            ) : (
              <PlayArrowIcon />
            )}
          </IconButton>

          {/* 音量: ホバーでスライダーが伸びる */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              "&:hover .volume-slider, &:focus-within .volume-slider": {
                width: 72,
                opacity: 1,
                ml: 1,
              },
            }}
          >
            <IconButton
              onClick={toggleMute}
              size="small"
              sx={{ color: "#fff" }}
              aria-label={muted ? "ミュート解除" : "ミュート"}
            >
              <VolumeIcon />
            </IconButton>
            <Slider
              className="volume-slider"
              aria-label="音量"
              size="small"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(_, v) => changeVolume(Array.isArray(v) ? v[0] : v)}
              sx={{
                width: 0,
                opacity: 0,
                ml: 0,
                overflow: "hidden",
                transition: "width 0.2s, opacity 0.2s, margin 0.2s",
                color: "#fff",
                "& .MuiSlider-thumb": {
                  width: 10,
                  height: 10,
                  boxShadow: "0 0 0 2px rgba(0,0,0,0.6)",
                  "&::before": { display: "none" },
                },
              }}
            />
          </Box>

          <Typography
            component="span"
            sx={{ ...displaySx, fontWeight: 600, fontSize: 15, ml: 1, opacity: 0.9 }}
          >
            {formatDuration(Math.floor(displayTime))} /{" "}
            {formatDuration(Math.floor(duration))}
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <IconButton
            onClick={toggleFullscreen}
            size="small"
            sx={{ color: "#fff" }}
            aria-label={fullscreen ? "全画面を終了" : "全画面"}
          >
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
}
