"use client";

// 音声の設定。元動画の音量と、追加した BGM（音量・音源の開始位置・繰り返し）。
// 鳴らす区間はタイムラインの帯をドラッグして決める。

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";
import { formatTimecode, type BgmTrack } from "@/lib/video-edit";
import { displaySx } from "@/theme";

interface Props {
  bgm: BgmTrack | null;
  originalVolume: number;
  clipLength: number;
  disabled: boolean;
  onPick: (file: File) => void;
  onChangeBgm: (next: BgmTrack) => void;
  onRemoveBgm: () => void;
  onChangeOriginalVolume: (volume: number) => void;
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

function percent(value: number): string {
  return `${Math.round(value * 100)}`;
}

export function AudioPanel({
  bgm,
  originalVolume,
  clipLength,
  disabled,
  onPick,
  onChangeBgm,
  onRemoveBgm,
  onChangeOriginalVolume,
}: Props) {
  // 音源の残りが区間より短ければ、繰り返さないと途中で無音になる
  const remaining = bgm ? bgm.durationSec - bgm.offset : 0;
  const span = bgm ? bgm.to - bgm.from : 0;
  const runsOut = Boolean(bgm) && !bgm?.loop && remaining < span - 0.1;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Stack direction="row" sx={{ alignItems: "baseline" }}>
          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
            元動画の音量
          </Typography>
          <Typography component="span" sx={{ ...displaySx, fontSize: 16 }}>
            {percent(originalVolume)}
          </Typography>
        </Stack>
        <Slider
          aria-label="元動画の音量"
          min={0}
          max={1}
          step={0.05}
          value={originalVolume}
          onChange={(_, v) => onChangeOriginalVolume(Array.isArray(v) ? v[0] : v)}
          sx={sliderSx}
        />
        <Typography variant="caption" color="text.secondary">
          0 にすると元の音を消し、BGM だけのクリップにできます。
        </Typography>
      </Box>

      {disabled && (
        <Typography variant="body2" color="text.secondary">
          このブラウザでは BGM を混ぜられません。Chrome / Edge の最新版をお使いください。
        </Typography>
      )}

      {!bgm ? (
        <Stack spacing={1} sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
          <Button
            component="label"
            variant="outlined"
            size="small"
            startIcon={<LibraryMusicIcon />}
            disabled={disabled}
            sx={{ alignSelf: "flex-start" }}
          >
            BGM を追加
            <input
              type="file"
              accept="audio/*"
              hidden
              disabled={disabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPick(file);
                e.target.value = "";
              }}
            />
          </Button>
          <Typography variant="body2" color="text.secondary">
            mp3 / m4a / wav / ogg などを選べます。追加すると、タイムラインの帯をドラッグして
            鳴らす区間を決められます。BGM は書き出す動画に混ぜ込まれます。
          </Typography>
        </Stack>
      ) : (
        <Stack spacing={2} sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <LibraryMusicIcon fontSize="small" />
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {bgm.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                音源 {formatTimecode(bgm.durationSec)} / 鳴らす区間{" "}
                {formatTimecode(bgm.from)} - {formatTimecode(bgm.to)}
              </Typography>
            </Box>
            <IconButton size="small" aria-label="BGM を外す" onClick={onRemoveBgm}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Box>
            <Stack direction="row" sx={{ alignItems: "baseline" }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                BGM の音量
              </Typography>
              <Typography component="span" sx={{ ...displaySx, fontSize: 16 }}>
                {percent(bgm.volume)}
              </Typography>
            </Stack>
            <Slider
              aria-label="BGM の音量"
              min={0}
              max={1}
              step={0.05}
              value={bgm.volume}
              onChange={(_, v) =>
                onChangeBgm({ ...bgm, volume: Array.isArray(v) ? v[0] : v })
              }
              sx={sliderSx}
            />
          </Box>

          <Box>
            <Stack direction="row" sx={{ alignItems: "baseline" }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                音源のどこから鳴らすか
              </Typography>
              <Typography component="span" sx={{ ...displaySx, fontSize: 16 }}>
                {formatTimecode(bgm.offset)}
              </Typography>
            </Stack>
            <Slider
              aria-label="音源の開始位置"
              min={0}
              max={Math.max(0.1, bgm.durationSec - 0.1)}
              step={0.1}
              value={Math.min(bgm.offset, Math.max(0.1, bgm.durationSec - 0.1))}
              onChange={(_, v) =>
                onChangeBgm({ ...bgm, offset: Array.isArray(v) ? v[0] : v })
              }
              sx={sliderSx}
            />
          </Box>

          <Stack direction="row" sx={{ alignItems: "center" }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2">区間の終わりまで繰り返す</Typography>
              {runsOut && (
                <Typography variant="caption" color="text.secondary">
                  音源が区間より短いため、途中で無音になります。
                </Typography>
              )}
            </Box>
            <Switch
              checked={bgm.loop}
              onChange={(e) => onChangeBgm({ ...bgm, loop: e.target.checked })}
            />
          </Stack>

          <Typography variant="caption" color="text.secondary">
            鳴らす区間はタイムラインの帯をドラッグして動かし、両端で長さを変えられます。
            クリップは全体で {formatTimecode(clipLength)} です。
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
