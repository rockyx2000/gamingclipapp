"use client";

// 投稿情報フェーズ。書き出した結果のプレビューと、タイトル・説明・ゲームの入力。

import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { formatTimecode } from "@/lib/video-edit";
import { displaySx } from "@/theme";
import type { Game } from "@/lib/types";

export interface ClipDetails {
  title: string;
  description: string;
  gameId: string;
}

interface Props {
  previewUrl: string;
  thumbnailUrl: string | null;
  lengthSec: number;
  sizeBytes: number;
  games: Game[];
  value: ClipDetails;
  onChange: (next: ClipDetails) => void;
  disabled: boolean;
}

function formatSize(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function DetailsStep({
  previewUrl,
  thumbnailUrl,
  lengthSec,
  sizeBytes,
  games,
  value,
  onChange,
  disabled,
}: Props) {
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

        {thumbnailUrl && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              サムネイル
            </Typography>
            <Box
              component="img"
              src={thumbnailUrl}
              alt="サムネイルのプレビュー"
              sx={{
                display: "block",
                width: "100%",
                maxWidth: 240,
                aspectRatio: "16 / 9",
                objectFit: "cover",
                borderRadius: 1,
                mt: 0.5,
              }}
            />
          </Box>
        )}
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
    </Grid>
  );
}
