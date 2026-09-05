"use client";

// テキスト（アノテーション）の追加と編集。位置はプレビュー上でドラッグして決める。

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { ANNOTATION_COLORS, formatTimecode, type TextAnnotation } from "@/lib/video-edit";
import { displaySx } from "@/theme";

interface Props {
  annotations: TextAnnotation[];
  selectedId: string | null;
  clipLength: number;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onChange: (next: TextAnnotation) => void;
  onRemove: (id: string) => void;
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

export function AnnotationPanel({
  annotations,
  selectedId,
  clipLength,
  onSelect,
  onAdd,
  onChange,
  onRemove,
}: Props) {
  const selected = annotations.find((a) => a.id === selectedId) ?? null;
  const rangeFrom = selected?.from ?? 0;
  const rangeTo = selected?.to ?? clipLength;

  return (
    <Stack spacing={2}>
      <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={onAdd}>
        テキストを追加
      </Button>

      {annotations.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          追加したテキストはプレビュー上でドラッグして位置を決められます。
        </Typography>
      ) : (
        <List dense disablePadding>
          {annotations.map((a) => (
            <ListItemButton
              key={a.id}
              selected={a.id === selectedId}
              onClick={() => onSelect(a.id)}
              sx={{ pr: 1 }}
            >
              <ListItemText
                primary={a.text || "（空のテキスト）"}
                secondary={
                  a.from !== undefined || a.to !== undefined
                    ? `${formatTimecode(a.from ?? 0)} - ${formatTimecode(a.to ?? clipLength)}`
                    : "クリップ全体"
                }
                slotProps={{ primary: { noWrap: true } }}
              />
              <IconButton
                size="small"
                aria-label="削除"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(a.id);
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </ListItemButton>
          ))}
        </List>
      )}

      {selected && (
        <Stack spacing={2} sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
          <TextField
            label="テキスト"
            multiline
            minRows={2}
            value={selected.text}
            onChange={(e) => onChange({ ...selected, text: e.target.value })}
            size="small"
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              色
            </Typography>
            <Stack direction="row" spacing={1}>
              {ANNOTATION_COLORS.map((color) => (
                <Box
                  key={color}
                  role="button"
                  aria-label={`色 ${color}`}
                  onClick={() => onChange({ ...selected, color })}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    bgcolor: color,
                    cursor: "pointer",
                    boxShadow:
                      selected.color === color
                        ? "0 0 0 2px #15171b, 0 0 0 4px #f2f3f5"
                        : "0 0 0 1px rgba(255,255,255,0.3)",
                  }}
                />
              ))}
            </Stack>
          </Box>

          <Box>
            <Stack direction="row" sx={{ alignItems: "baseline" }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                文字の大きさ
              </Typography>
              <Typography component="span" sx={{ ...displaySx, fontSize: 16 }}>
                {Math.round(selected.size * 100)}
              </Typography>
            </Stack>
            <Slider
              aria-label="文字の大きさ"
              min={0.03}
              max={0.18}
              step={0.005}
              value={selected.size}
              onChange={(_, v) => onChange({ ...selected, size: Array.isArray(v) ? v[0] : v })}
              sx={sliderSx}
            />
          </Box>

          <Stack direction="row" sx={{ alignItems: "center" }}>
            <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
              黒い下地を敷く
            </Typography>
            <Switch
              checked={selected.background}
              onChange={(e) => onChange({ ...selected, background: e.target.checked })}
            />
          </Stack>

          <Box>
            <Stack direction="row" sx={{ alignItems: "baseline" }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                表示する区間
              </Typography>
              <Typography component="span" sx={{ ...displaySx, fontSize: 16 }}>
                {formatTimecode(rangeFrom)} - {formatTimecode(rangeTo)}
              </Typography>
            </Stack>
            <Slider
              aria-label="表示する区間"
              min={0}
              max={clipLength}
              step={0.1}
              value={[rangeFrom, rangeTo]}
              disableSwap
              onChange={(_, v) => {
                if (!Array.isArray(v)) return;
                const [from, to] = v;
                onChange({
                  ...selected,
                  from: from <= 0 ? undefined : from,
                  to: to >= clipLength ? undefined : to,
                });
              }}
              sx={sliderSx}
            />
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
