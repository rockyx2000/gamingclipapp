"use client";

// スマホ向けの全画面・縦スワイプ視聴（YouTube Shorts 風）
// md 未満の画面幅でのみマウントされ、AppShell の上に fixed で被せる。
// 開いたクリップを先頭に、同じゲーム → 他のクリップと続くフィードを表示し、
// スワイプで切り替わるたびに URL を /clips/<id> へ置き換える。
// listId があるとき（プレイリスト再生）は渡されたプレイリストの順に並び、URL にも ?list を残す。

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChatBubbleOutlinedIcon from "@mui/icons-material/ChatBubbleOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import ShareIcon from "@mui/icons-material/Share";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import type { ClipWithGame } from "@/lib/types";
import { formatDuration, formatViews } from "@/lib/format";
import { displaySx } from "@/theme";
import { Wordmark } from "./Wordmark";
import { CommentsSheet } from "./CommentsSheet";
import { SaveToPlaylistDialog } from "./SaveToPlaylistDialog";
import { useLike } from "./useLike";
import { useRecordView } from "./useRecordView";
import { useRequireLogin } from "./useRequireLogin";

interface Props {
  clips: ClipWithGame[];
  startId: string;
  /** ログイン中のユーザーがいいね済みのクリップ ID */
  likedIds: string[];
  /** プレイリスト再生中ならその ID */
  listId?: string;
}

export function MobileClipFeed(props: Props) {
  const theme = useTheme();
  // SSR とハイドレーション時は false になり、クライアントで判定後に描画される
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  if (!isMobile) return null;
  return <Feed {...props} />;
}

function Feed({ clips, startId, likedIds, listId }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState(startId);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saveClipId, setSaveClipId] = useState<string | null>(null);
  const [commentClip, setCommentClip] = useState<ClipWithGame | null>(null);
  // シートで投稿・削除した後の件数（ボタンの数字に反映する）
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const requireLogin = useRequireLogin();
  const recordView = useRecordView();

  // 背後のページ（PC レイアウト）がスクロールしないようにロックする
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // 開いたクリップの位置へ移動する（通常は先頭）
  useEffect(() => {
    const target = containerRef.current?.querySelector<HTMLElement>(
      `[data-clip-id="${startId}"]`,
    );
    target?.scrollIntoView({ behavior: "instant", block: "start" });
  }, [startId]);

  // 画面の大半を占めているクリップをアクティブにする
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.clipId;
          if (id) setActiveId(id);
        }
      },
      { root: container, threshold: 0.6 },
    );
    container
      .querySelectorAll("[data-clip-id]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [clips]);

  // アクティブなクリップだけ再生し、それ以外は停止して先頭に戻す
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setPaused(false);
    container.querySelectorAll<HTMLVideoElement>("video").forEach((video) => {
      if (video.dataset.clipId === activeId) {
        video.muted = muted;
        video
          .play()
          .then(() => recordView(activeId))
          .catch(() => {
            // 音声付き自動再生がブロックされた場合はミュートで再生する
            video.muted = true;
            setMuted(true);
            video
              .play()
              .then(() => recordView(activeId))
              .catch(() => {});
          });
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
    // スワイプで切り替わったクリップの URL を共有できるようにする
    const url = listId ? `/clips/${activeId}?list=${listId}` : `/clips/${activeId}`;
    if (window.location.pathname + window.location.search !== url) {
      window.history.replaceState(null, "", url);
    }
  }, [activeId, muted, listId, recordView]);

  // 下端の細い進行バーを requestAnimationFrame で滑らかに更新する
  // （React の state を使うと timeupdate の頻度に縛られてカクつくため DOM を直接触る）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const video = container.querySelector<HTMLVideoElement>(
      `video[data-clip-id="${activeId}"]`,
    );
    const bar = container.querySelector<HTMLElement>(
      `[data-progress-id="${activeId}"]`,
    );
    if (!video || !bar) return;
    let frame = 0;
    const tick = () => {
      const ratio = video.duration ? video.currentTime / video.duration : 0;
      bar.style.transform = `scaleX(${ratio})`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeId]);

  const togglePlay = useCallback(
    (video: HTMLVideoElement) => {
      if (video.paused) {
        video.play().catch(() => {});
        setPaused(false);
      } else {
        video.pause();
        setPaused(true);
      }
    },
    [],
  );

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const handleShare = async (clip: ClipWithGame) => {
    const url = `${window.location.origin}/clips/${clip.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: clip.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast("リンクをコピーしました");
      }
    } catch {
      // ユーザーが共有をキャンセルした場合など
    }
  };

  const openSave = (id: string) => {
    if (requireLogin()) setSaveClipId(id);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: (t) => t.zIndex.modal,
        bgcolor: "#000",
        color: "#fff",
      }}
    >
      <Box
        ref={containerRef}
        sx={{
          height: "100%",
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          overscrollBehavior: "contain",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {clips.map((clip) => {
          const isActive = clip.id === activeId;
          return (
            <Box
              key={clip.id}
              data-clip-id={clip.id}
              sx={{
                height: "100%",
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                component="video"
                data-clip-id={clip.id}
                src={clip.videoUrl}
                poster={clip.thumbnailUrl}
                loop
                muted
                playsInline
                preload={isActive ? "auto" : "metadata"}
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
                onClick={(e: React.MouseEvent<HTMLVideoElement>) =>
                  togglePlay(e.currentTarget)
                }
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  bgcolor: "#000",
                }}
              />

              {isActive && paused && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <PlayArrowIcon sx={{ fontSize: 72, opacity: 0.85 }} />
                </Box>
              )}

              {/* 下端の進行バー（Shorts 風） */}
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 3,
                  bgcolor: "rgba(255,255,255,0.25)",
                  zIndex: 1,
                }}
              >
                <Box
                  data-progress-id={clip.id}
                  sx={{
                    height: "100%",
                    width: "100%",
                    transformOrigin: "left",
                    transform: "scaleX(0)",
                    bgcolor: "#fff",
                  }}
                />
              </Box>

              {/* 下部グラデーション */}
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: "45%",
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
                  pointerEvents: "none",
                }}
              />

              {/* 右側のアクション */}
              <Stack
                spacing={2.5}
                sx={{
                  position: "absolute",
                  right: 8,
                  bottom: 96,
                  alignItems: "center",
                }}
              >
                <FeedLikeButton
                  clipId={clip.id}
                  initialLiked={likedIds.includes(clip.id)}
                  initialLikes={clip.likes}
                />
                <Stack sx={{ alignItems: "center" }}>
                  <IconButton
                    onClick={() => setCommentClip(clip)}
                    sx={{ color: "#fff" }}
                    aria-label="コメント"
                  >
                    <ChatBubbleOutlinedIcon />
                  </IconButton>
                  <Typography component="span" sx={{ ...displaySx, fontSize: 14 }}>
                    {(commentCounts[clip.id] ?? clip.commentCount).toLocaleString()}
                  </Typography>
                </Stack>
                <Stack sx={{ alignItems: "center" }}>
                  <IconButton
                    onClick={() => openSave(clip.id)}
                    sx={{ color: "#fff" }}
                    aria-label="プレイリストに保存"
                  >
                    <PlaylistAddIcon />
                  </IconButton>
                  <Typography variant="caption">保存</Typography>
                </Stack>
                <Stack sx={{ alignItems: "center" }}>
                  <IconButton
                    onClick={() => handleShare(clip)}
                    sx={{ color: "#fff" }}
                    aria-label="共有"
                  >
                    <ShareIcon />
                  </IconButton>
                  <Typography variant="caption">共有</Typography>
                </Stack>
              </Stack>

              {/* 左下の情報 */}
              <Stack
                spacing={1}
                sx={{
                  position: "absolute",
                  left: 16,
                  right: 72,
                  bottom: 24,
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Avatar
                    src={clip.uploader.avatarUrl}
                    sx={{ width: 32, height: 32 }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {clip.uploader.displayName}
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {clip.title}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", flexWrap: "wrap" }}
                >
                  <Link
                    href={`/games/${clip.game.slug}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Chip
                      label={clip.game.name}
                      size="small"
                      clickable
                      sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff" }}
                    />
                  </Link>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {formatViews(clip.views)} - {formatDuration(clip.durationSec)}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          );
        })}
      </Box>

      {/* 上部バー */}
      <Stack
        direction="row"
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          p: 1,
          alignItems: "center",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)",
        }}
      >
        <IconButton onClick={handleBack} sx={{ color: "#fff" }} aria-label="戻る">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Wordmark size={20} onVideo />
        </Box>
        <IconButton
          onClick={() => setMuted((m) => !m)}
          sx={{ color: "#fff" }}
          aria-label={muted ? "ミュート解除" : "ミュート"}
        >
          {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>
      </Stack>

      <Snackbar
        open={toast !== null}
        autoHideDuration={2000}
        onClose={() => setToast(null)}
        message={toast}
      />

      {commentClip && (
        <CommentsSheet
          open
          onClose={() => setCommentClip(null)}
          clipId={commentClip.id}
          uploaderId={commentClip.uploader.id}
          initialCount={commentCounts[commentClip.id] ?? commentClip.commentCount}
          onCountChange={(count) =>
            setCommentCounts((prev) => ({ ...prev, [commentClip.id]: count }))
          }
        />
      )}

      {saveClipId && (
        <SaveToPlaylistDialog
          open
          onClose={() => setSaveClipId(null)}
          clipId={saveClipId}
        />
      )}
    </Box>
  );
}

function FeedLikeButton({
  clipId,
  initialLiked,
  initialLikes,
}: {
  clipId: string;
  initialLiked: boolean;
  initialLikes: number;
}) {
  const { liked, likes, toggle } = useLike(clipId, initialLiked, initialLikes);
  return (
    <Stack sx={{ alignItems: "center" }}>
      <IconButton
        onClick={toggle}
        sx={{ color: liked ? "primary.main" : "#fff" }}
        aria-label={liked ? "いいねを取り消す" : "いいね"}
        aria-pressed={liked}
      >
        {liked ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
      </IconButton>
      <Typography component="span" sx={{ ...displaySx, fontSize: 14 }}>
        {likes.toLocaleString()}
      </Typography>
    </Stack>
  );
}
