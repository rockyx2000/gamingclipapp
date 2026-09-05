"use client";

// 投稿情報フェーズ。書き出した結果のプレビューと、サムネイルの選択、
// タイトル・説明・ゲームの入力。
// サムネイルは「動画のどこかのコマを選ぶ」か「手持ちの画像を上げる」かのどちらか。

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import { formatTimecode } from "@/lib/video-edit";
import { displaySx } from "@/theme";
import type { Game } from "@/lib/types";

export interface ClipDetails {
  title: string;
  description: string;
  gameId: string;
}

/** サムネイルとして受け付ける画像 */
export const THUMBNAIL_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ThumbnailKind = "frame" | "image";

interface Props {
  previewUrl: string;
  lengthSec: number;
  sizeBytes: number;
  games: Game[];
  value: ClipDetails;
  onChange: (next: ClipDetails) => void;
  disabled: boolean;
  thumbnailUrl: string | null;
  thumbnailKind: ThumbnailKind;
  frameTime: number;
  thumbnailBusy: boolean;
  thumbnailError: string | null;
  onPickFrame: (time: number) => void;
  onPickImage: (file: File) => void;
}

function formatSize(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

const sliderSx = {
  color: "#fff",
  "& .MuiSlider-rail": { opacity: 0.25 },
  "& .MuiSlider-thumb": {
    width: 14,
    height: 14,
    boxShadow: "0 0 0 2px rgba(0,0,0,0.6)",
    "&::before": { display: "none" },
  },
} as const;

export function DetailsStep({
  previewUrl,
  lengthSec,
  sizeBytes,
  games,
  value,
  onChange,
  disabled,
  thumbnailUrl,
  thumbnailKind,
  frameTime,
  thumbnailBusy,
  thumbnailError,
  onPickFrame,
  onPickImage,
}: Props) {
  // つまみを動かしている間は手元の値で追従し、離したときだけコマを切り出す。
  // まだ触っていない間は、実際に切り出された位置（frameTime）に合わせておく。
  const [dragTime, setDragTime] = useState<number | null>(null);
  const sliderTime = dragTime ?? frameTime;

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Box sx={{ bgcolor: "#000", borderRadius: 1, p: 1 }}>
          <Box
            component="video"
            src={previewUrl}
            controls
            playsInline
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            sx={{
              display: "block",
              width: "100%",
              aspectRatio: "16 / 9",
              objectFit: "contain",
              bgcolor: "#000",
            }}
          />
        </Box>
        <Stack direction="row" spacing={2} sx={{ mt: 1, alignItems: "baseline" }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "baseline" }}>
            <Typography component="span" sx={{ ...displaySx, fontSize: 20 }}>
              {formatTimecode(lengthSec)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              長さ
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "baseline" }}>
            <Typography component="span" sx={{ ...displaySx, fontSize: 20 }}>
              {formatSize(sizeBytes)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              サイズ
            </Typography>
          </Stack>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Stack spacing={2.5}>
          <TextField
            required
            label="タイトル"
            placeholder="例: 【VALORANT】1v5クラッチ"
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            disabled={disabled}
          />
          <TextField
            multiline
            minRows={4}
            label="説明"
            placeholder="どんな場面か、見どころはどこかを書きましょう"
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            disabled={disabled}
          />
          <TextField
            select
            required
            label="ゲーム"
            value={value.gameId}
            onChange={(e) => onChange({ ...value, gameId: e.target.value })}
            disabled={disabled}
          >
            {games.map((game) => (
              <MenuItem key={game.id} value={game.id}>
                {game.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Grid>

      <Grid size={12}>
        <Stack spacing={1.5} sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
          <Typography variant="subtitle2">サムネイル</Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 5, md: 4 }}>
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "16 / 9",
                  bgcolor: "#000",
                  borderRadius: 1,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {thumbnailUrl ? (
                  <Box
                    component="img"
                    src={thumbnailUrl}
                    alt="サムネイルのプレビュー"
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    サムネイル未設定
                  </Typography>
                )}
                {thumbnailBusy && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "rgba(0,0,0,0.5)",
                    }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                )}
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 7, md: 8 }}>
              <Stack spacing={1.5}>
                <Box>
                  <Stack direction="row" sx={{ alignItems: "baseline" }}>
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      動画から選ぶ
                    </Typography>
                    <Typography component="span" sx={{ ...displaySx, fontSize: 16 }}>
                      {formatTimecode(sliderTime)}
                    </Typography>
                  </Stack>
                  <Slider
                    aria-label="サムネイルにするコマ"
                    min={0}
                    max={Math.max(0.1, lengthSec)}
                    step={0.1}
                    value={Math.min(sliderTime, Math.max(0.1, lengthSec))}
                    disabled={disabled}
                    onChange={(_, v) => setDragTime(Array.isArray(v) ? v[0] : v)}
                    onChangeCommitted={(_, v) => onPickFrame(Array.isArray(v) ? v[0] : v)}
                    sx={sliderSx}
                  />
                </Box>

                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                  <Button
                    component="label"
                    variant="outlined"
                    size="small"
                    startIcon={<ImageOutlinedIcon />}
                    disabled={disabled}
                  >
                    画像をアップロード
                    <input
                      type="file"
                      accept={THUMBNAIL_TYPES.join(",")}
                      hidden
                      disabled={disabled}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onPickImage(file);
                        e.target.value = "";
                      }}
                    />
                  </Button>
                  {thumbnailKind === "image" && (
                    <Button
                      size="small"
                      disabled={disabled}
                      onClick={() => onPickFrame(sliderTime)}
                    >
                      動画のコマに戻す
                    </Button>
                  )}
                </Stack>

                <Typography variant="caption" color="text.secondary">
                  {thumbnailKind === "image"
                    ? "アップロードした画像を使います。"
                    : "つまみを離したところのコマを切り出します。"}
                  {" "}JPEG / PNG / WebP に対応しています。
                </Typography>
                {thumbnailError && (
                  <Typography variant="caption" color="warning.main">
                    {thumbnailError}
                  </Typography>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </Grid>
    </Grid>
  );
}
