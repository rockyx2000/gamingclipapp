"use client";

// フィルター（プリセットと明るさ・コントラスト・彩度の微調整）

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  DEFAULT_FILTERS,
  FILTER_PRESETS,
  isDefaultFilter,
  type FilterSettings,
} from "@/lib/video-edit";
import { displaySx } from "@/theme";

interface Props {
  value: FilterSettings;
  onChange: (next: FilterSettings) => void;
}

const selectedChipSx = {
  bgcolor: "#f2f3f5",
  color: "#15171b",
  fontWeight: 700,
  "&:hover": { bgcolor: "#fff" },
} as const;

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

function sameFilter(a: FilterSettings, b: FilterSettings): boolean {
  return (
    a.brightness === b.brightness &&
    a.contrast === b.contrast &&
    a.saturate === b.saturate &&
    a.sepia === b.sepia &&
    a.grayscale === b.grayscale
  );
}

interface AdjustProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

function Adjust({ label, value, min, max, onChange }: AdjustProps) {
  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: "baseline" }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {label}
        </Typography>
        <Typography component="span" sx={{ ...displaySx, fontSize: 16 }}>
          {Math.round(value * 100)}%
        </Typography>
      </Stack>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={0.05}
        value={value}
        onChange={(_, v) => onChange(Array.isArray(v) ? v[0] : v)}
        sx={sliderSx}
      />
    </Box>
  );
}

export function FilterPanel({ value, onChange }: Props) {
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          プリセット
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
          {FILTER_PRESETS.map((preset) => (
            <Chip
              key={preset.id}
              label={preset.label}
              clickable
              onClick={() => onChange(preset.values)}
              sx={sameFilter(value, preset.values) ? selectedChipSx : undefined}
            />
          ))}
        </Stack>
      </Box>
      <Adjust
        label="明るさ"
        value={value.brightness}
        min={0.5}
        max={1.5}
        onChange={(v) => onChange({ ...value, brightness: v })}
      />
      <Adjust
        label="コントラスト"
        value={value.contrast}
        min={0.5}
        max={1.5}
        onChange={(v) => onChange({ ...value, contrast: v })}
      />
      <Adjust
        label="彩度"
        value={value.saturate}
        min={0}
        max={2}
        onChange={(v) => onChange({ ...value, saturate: v })}
      />
      <Button
        variant="outlined"
        size="small"
        disabled={isDefaultFilter(value)}
        onClick={() => onChange(DEFAULT_FILTERS)}
        sx={{ alignSelf: "flex-start" }}
      >
        フィルターを外す
      </Button>
    </Stack>
  );
}
