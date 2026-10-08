"use client";

// 投稿画面のタグ付け（Instagram のように、映像の上の位置にユーザーを付ける）。
// 「タグを付ける」を押すと映像を止めて、クリックした位置にユーザーを選んで付ける。
// 付けた札はドラッグで動かせ、× で外せる。位置は映像のコマに対する割合（0〜1）で持つ。
// 映像の頭出しは、タグ付けを始める前にプレイヤーの操作で済ませておく。

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import PersonPinIcon from "@mui/icons-material/PersonPin";
import { clamp01 } from "@/lib/clip-tags";
import { MAX_CLIP_TAGS, type ClipTag, type User } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { TagLabel } from "./TagLabel";
import { UserSearchField } from "./UserSearchField";
import { useContentRect } from "./useContentRect";

interface Props {
  previewUrl: string;
  value: ClipTag[];
  onChange: (next: ClipTag[]) => void;
  disabled?: boolean;
}

interface Pending {
  x: number;
  y: number;
  /** ポップオーバーを出す画面上の位置 */
  anchor: { left: number; top: number };
}

export function TagEditor({ previewUrl, value, onChange, disabled }: Props) {
  const { user: me } = useAuth();
  const [tagging, setTagging] = useState(false);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [pending, setPending] = useState<Pending | null>(null);
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const rect = useContentRect(frame, aspect);
  const drag = useRef<{ id: string; moved: boolean } | null>(null);
  // 札をドラッグして離したあとに続けて届くクリックを、新しいタグ付けとして扱わない
  const suppressClick = useRef(false);
  const full = value.length >= MAX_CLIP_TAGS;

  // 画面上の座標を、映像のコマに対する割合に直す（黒帯の上なら null）
  const toRatio = (clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!frame || rect.width === 0 || rect.height === 0) return null;
    const box = frame.getBoundingClientRect();
    const x = (clientX - box.left - rect.left) / rect.width;
    const y = (clientY - box.top - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y };
  };

  const handleLayerClick = (e: React.MouseEvent) => {
    if (!tagging || full) return;
    // 札の上のクリックと、ドラッグの直後のクリックは、新しいタグ付けではない
    if (suppressClick.current || (e.target as HTMLElement).closest("[data-tag-label]")) return;
    const ratio = toRatio(e.clientX, e.clientY);
    if (ratio) setPending({ ...ratio, anchor: { left: e.clientX, top: e.clientY } });
  };

  const handleSelect = (user: User) => {
    if (!pending) return;
    onChange([...value, { user, x: pending.x, y: pending.y }]);
    setPending(null);
  };

  const handleRemove = (id: string) => onChange(value.filter((t) => t.user.id !== id));

  // 札のドラッグ。掴んだ札だけを動かし、映像の外には出さない
  const startDrag = (id: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // キャプチャできなくても、ドラッグ自体は layer 上の pointermove で追える
    }
    drag.current = { id, moved: false };
  };
  const handleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const box = frame?.getBoundingClientRect();
    if (!box || rect.width === 0) return;
    const x = clamp01((e.clientX - box.left - rect.left) / rect.width);
    const y = clamp01((e.clientY - box.top - rect.top) / rect.height);
    const id = drag.current.id;
    drag.current.moved = true;
    onChange(value.map((t) => (t.user.id === id ? { ...t, x, y } : t)));
  };
  const endDrag = () => {
    if (drag.current?.moved) {
      // このあとにブラウザが送ってくるクリックを 1 回だけ無視する
      suppressClick.current = true;
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }
    drag.current = null;
  };

  return (
    <Box>
      <Box sx={{ bgcolor: "#000", borderRadius: 1, p: 1 }}>
        <Box ref={setFrame} sx={{ position: "relative" }}>
          <Box
            component="video"
            src={previewUrl}
            // タグ付け中は止めて、クリックをタグの位置として受ける
            controls={!tagging}
            playsInline
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            onLoadedMetadata={(e: React.SyntheticEvent<HTMLVideoElement>) => {
              const { videoWidth, videoHeight } = e.currentTarget;
              if (videoWidth && videoHeight) setAspect(videoWidth / videoHeight);
            }}
            sx={{
              display: "block",
              width: "100%",
              aspectRatio: "16 / 9",
              objectFit: "contain",
              bgcolor: "#000",
            }}
          />
          <Box
            onClick={handleLayerClick}
            onPointerMove={handleMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            sx={{
              position: "absolute",
              inset: 0,
              // 通常は下の動画の操作を邪魔しない。タグ付け中だけクリックを受ける
              pointerEvents: tagging ? "auto" : "none",
              cursor: tagging && !full ? "crosshair" : "default",
              outline: tagging ? "2px solid rgba(242,183,5,0.8)" : "none",
              outlineOffset: -2,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
              }}
            >
              {value.map((tag) => (
                <TagLabel
                  key={tag.user.id}
                  tag={tag}
                  onPointerDown={tagging ? startDrag(tag.user.id) : undefined}
                  action={
                    <IconButton
                      size="small"
                      aria-label={`${tag.user.displayName}のタグを外す`}
                      // 札のドラッグと取り違えない
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(tag.user.id);
                      }}
                      disabled={disabled}
                      sx={{ p: 0.25, color: "inherit", pointerEvents: "auto" }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  }
                />
              ))}
              {pending && (
                // 付ける位置の目印
                <Box
                  sx={{
                    position: "absolute",
                    left: `${pending.x * 100}%`,
                    top: `${pending.y * 100}%`,
                    width: 14,
                    height: 14,
                    transform: "translate(-50%, -50%)",
                    borderRadius: "50%",
                    border: "2px solid #fff",
                    boxShadow: "0 0 0 2px rgba(0,0,0,0.5)",
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ mt: 1, alignItems: "center", flexWrap: "wrap" }}>
        <Button
          size="small"
          variant={tagging ? "contained" : "outlined"}
          startIcon={<PersonPinIcon />}
          onClick={() => {
            setTagging(!tagging);
            setPending(null);
          }}
          disabled={disabled}
        >
          {tagging ? "タグ付けを終える" : "タグを付ける"}
        </Button>
        <Typography variant="caption" color="text.secondary">
          {tagging
            ? full
              ? `タグは${MAX_CLIP_TAGS}人までです`
              : "映像の人をクリックして、ユーザーを選びます。タグはドラッグで動かせます"
            : `映っているユーザーを映像の上に付けられます（${value.length} / ${MAX_CLIP_TAGS}）。付けられた本人は外せます`}
        </Typography>
      </Stack>

      <Popover
        open={pending !== null}
        onClose={() => setPending(null)}
        anchorReference="anchorPosition"
        anchorPosition={pending ? { left: pending.anchor.left, top: pending.anchor.top } : undefined}
        slotProps={{ paper: { sx: { p: 1.5, mt: 1 } } }}
      >
        <UserSearchField
          autoFocus
          onSelect={handleSelect}
          excludeIds={[...(me ? [me.id] : []), ...value.map((t) => t.user.id)]}
        />
      </Popover>
    </Box>
  );
}
