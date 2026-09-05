"use client";

// 編集フェーズ。プレビュー + タイムライン + 右側のタブ（範囲 / フィルター / テキスト）。

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { Timeline } from "./Timeline";
import { FilterPanel } from "./FilterPanel";
import { AnnotationPanel } from "./AnnotationPanel";
import { PreviewStage, type PreviewStageHandle } from "./PreviewStage";
import {
  formatTimecode,
  type ClipEdit,
  type TextAnnotation,
} from "@/lib/video-edit";

interface Props {
  file: File;
  previewUrl: string;
  durationSec: number;
  aspect: number;
  maxSec: number;
  edit: ClipEdit;
  onChange: (next: ClipEdit) => void;
}

function createAnnotation(): TextAnnotation {
  return {
    id: crypto.randomUUID(),
    text: "ナイスプレイ",
    x: 0.5,
    y: 0.82,
    size: 0.08,
    color: "#ffffff",
    background: false,
  };
}

export function EditStep({
  file,
  previewUrl,
  durationSec,
  aspect,
  maxSec,
  edit,
  onChange,
}: Props) {
  const previewRef = useRef<PreviewStageHandle>(null);
  const [tab, setTab] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(edit.trim.start);

  const updateAnnotation = (next: TextAnnotation) => {
    onChange({
      ...edit,
      annotations: edit.annotations.map((a) => (a.id === next.id ? next : a)),
    });
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Stack spacing={2}>
          <PreviewStage
            ref={previewRef}
            previewUrl={previewUrl}
            aspect={aspect}
            trim={edit.trim}
            filters={edit.filters}
            annotations={edit.annotations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMoveAnnotation={(id, x, y) => {
              const target = edit.annotations.find((a) => a.id === id);
              if (target) updateAnnotation({ ...target, x, y });
            }}
            onTimeChange={setPlayhead}
          />
          <Timeline
            file={file}
            durationSec={durationSec}
            maxSec={maxSec}
            value={edit.trim}
            onChange={(trim) => onChange({ ...edit, trim })}
            playhead={playhead}
            onSeek={(t) => previewRef.current?.seek(t)}
          />
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="範囲" />
            <Tab label="フィルター" />
            <Tab label={`テキスト${edit.annotations.length > 0 ? ` (${edit.annotations.length})` : ""}`} />
          </Tabs>

          {tab === 0 && (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                タイムラインの白い枠が投稿する範囲です。枠の中をドラッグすると範囲ごと動き、
                左右のつまみで長さを変えられます。拡大すると細かく合わせられます。
              </Typography>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  開始 {formatTimecode(edit.trim.start)} / 終了{" "}
                  {formatTimecode(edit.trim.start + edit.trim.length)} / 長さ{" "}
                  {formatTimecode(edit.trim.length)}（最大 {formatTimecode(maxSec)}）
                </Typography>
              </Box>
            </Stack>
          )}

          {tab === 1 && (
            <FilterPanel
              value={edit.filters}
              onChange={(filters) => onChange({ ...edit, filters })}
            />
          )}

          {tab === 2 && (
            <AnnotationPanel
              annotations={edit.annotations}
              selectedId={selectedId}
              clipLength={edit.trim.length}
              onSelect={setSelectedId}
              onAdd={() => {
                const created = createAnnotation();
                onChange({ ...edit, annotations: [...edit.annotations, created] });
                setSelectedId(created.id);
              }}
              onChange={updateAnnotation}
              onRemove={(id) => {
                onChange({
                  ...edit,
                  annotations: edit.annotations.filter((a) => a.id !== id),
                });
                if (selectedId === id) setSelectedId(null);
              }}
            />
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}
