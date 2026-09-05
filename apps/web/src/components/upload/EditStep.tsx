"use client";

// 編集フェーズ。プレビュー + タイムライン + 右側のタブ（範囲 / フィルター / テキスト / 音声）。

import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
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
import { AudioPanel } from "./AudioPanel";
import { PreviewStage, type PreviewStageHandle } from "./PreviewStage";
import {
  clampAnnotations,
  clampBgm,
  formatTimecode,
  type BgmTrack,
  type ClipEdit,
  type TextAnnotation,
  type TrimSelection,
} from "@/lib/video-edit";

interface Props {
  file: File;
  previewUrl: string;
  durationSec: number;
  aspect: number;
  maxSec: number;
  edit: ClipEdit;
  onChange: (next: ClipEdit) => void;
  /** 追加した BGM の再生用 URL（プレビューで鳴らす） */
  bgmUrl: string | null;
  bgmError: string | null;
  audioSupported: boolean;
  onPickBgm: (file: File) => void;
  onRemoveBgm: () => void;
}

const TAB_AUDIO = 3;

// 追加位置は再生ヘッドから。区間はクリップに収まる範囲で 3 秒
function createAnnotation(at: number, clipLength: number): TextAnnotation {
  const span = Math.min(3, clipLength);
  const from = Math.min(Math.max(0, at), Math.max(0, clipLength - span));
  return {
    id: crypto.randomUUID(),
    text: "ナイスプレイ",
    x: 0.5,
    y: 0.82,
    size: 0.08,
    color: "#ffffff",
    background: false,
    from,
    to: from + span,
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
  bgmUrl,
  bgmError,
  audioSupported,
  onPickBgm,
  onRemoveBgm,
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

  const updateBgm = (next: BgmTrack) => {
    onChange({ ...edit, bgm: next });
  };

  // 範囲を縮めたとき、はみ出したテキストと BGM の区間も一緒に詰める
  const updateTrim = (trim: TrimSelection) => {
    onChange({
      ...edit,
      trim,
      annotations: clampAnnotations(edit.annotations, trim.length),
      bgm: clampBgm(edit.bgm, trim.length),
    });
  };

  const addAnnotation = () => {
    const created = createAnnotation(playhead - edit.trim.start, edit.trim.length);
    onChange({ ...edit, annotations: [...edit.annotations, created] });
    setSelectedId(created.id);
    setTab(2);
  };

  const pickBgm = (picked: File) => {
    onPickBgm(picked);
    setTab(TAB_AUDIO);
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
            originalVolume={edit.originalVolume}
            bgm={edit.bgm}
            bgmUrl={bgmUrl}
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
            onChange={updateTrim}
            playhead={playhead}
            onSeek={(t) => previewRef.current?.seek(t)}
            annotations={edit.annotations}
            selectedAnnotationId={selectedId}
            onSelectAnnotation={setSelectedId}
            onChangeAnnotation={updateAnnotation}
            onAddAnnotation={addAnnotation}
            bgm={edit.bgm}
            onPickBgm={pickBgm}
            onChangeBgm={updateBgm}
            onFocusBgm={() => setTab(TAB_AUDIO)}
            audioDisabled={!audioSupported}
          />
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons={false}
            sx={{ mb: 2 }}
          >
            <Tab label="範囲" />
            <Tab label="フィルター" />
            <Tab label={`テキスト${edit.annotations.length > 0 ? ` (${edit.annotations.length})` : ""}`} />
            <Tab label={edit.bgm ? "音声 (1)" : "音声"} />
          </Tabs>

          {bgmError && tab === TAB_AUDIO && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {bgmError}
            </Alert>
          )}

          {tab === 0 && (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                タイムラインの白い枠が投稿する範囲です。枠の中をドラッグすると範囲ごと動き、
                左右のつまみで長さを変えられます。上の目盛りをドラッグすると再生位置が動きます。
                拡大すると細かく合わせられます。
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
              onAdd={addAnnotation}
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

          {tab === TAB_AUDIO && (
            <AudioPanel
              bgm={edit.bgm}
              originalVolume={edit.originalVolume}
              clipLength={edit.trim.length}
              disabled={!audioSupported}
              onPick={onPickBgm}
              onChangeBgm={updateBgm}
              onRemoveBgm={onRemoveBgm}
              onChangeOriginalVolume={(originalVolume) => onChange({ ...edit, originalVolume })}
            />
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}
