// 投稿前の編集状態（切り出し範囲・フィルター・テキスト）の型と、描画の共通処理。
// プレビュー（CSS / DOM）と書き出し（canvas）で同じ値を使い、見た目を一致させる。

export interface TrimSelection {
  /** 開始位置（元動画の秒） */
  start: number;
  /** 長さ（秒）。1 以上 MAX_CLIP_DURATION_SEC 以下 */
  length: number;
}

export interface FilterSettings {
  /** 1 が標準。0.5〜1.5 */
  brightness: number;
  /** 1 が標準。0.5〜1.5 */
  contrast: number;
  /** 1 が標準。0〜2 */
  saturate: number;
  /** 0 が標準。0〜1 */
  sepia: number;
  /** 0 が標準。0〜1 */
  grayscale: number;
}

export const DEFAULT_FILTERS: FilterSettings = {
  brightness: 1,
  contrast: 1,
  saturate: 1,
  sepia: 0,
  grayscale: 0,
};

export interface FilterPreset {
  id: string;
  label: string;
  values: FilterSettings;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "none", label: "なし", values: DEFAULT_FILTERS },
  {
    id: "vivid",
    label: "ビビッド",
    values: { brightness: 1.05, contrast: 1.15, saturate: 1.4, sepia: 0, grayscale: 0 },
  },
  {
    id: "cool",
    label: "クール",
    values: { brightness: 1, contrast: 1.1, saturate: 0.8, sepia: 0, grayscale: 0.2 },
  },
  {
    id: "retro",
    label: "レトロ",
    values: { brightness: 1.05, contrast: 0.95, saturate: 0.9, sepia: 0.45, grayscale: 0 },
  },
  {
    id: "mono",
    label: "モノクロ",
    values: { brightness: 1, contrast: 1.15, saturate: 1, sepia: 0, grayscale: 1 },
  },
];

export function isDefaultFilter(f: FilterSettings): boolean {
  return (
    f.brightness === 1 &&
    f.contrast === 1 &&
    f.saturate === 1 &&
    f.sepia === 0 &&
    f.grayscale === 0
  );
}

/** CSS の filter 文字列。canvas の ctx.filter にもそのまま使える */
export function cssFilter(f: FilterSettings): string {
  if (isDefaultFilter(f)) return "none";
  const parts: string[] = [];
  if (f.brightness !== 1) parts.push(`brightness(${f.brightness})`);
  if (f.contrast !== 1) parts.push(`contrast(${f.contrast})`);
  if (f.saturate !== 1) parts.push(`saturate(${f.saturate})`);
  if (f.sepia !== 0) parts.push(`sepia(${f.sepia})`);
  if (f.grayscale !== 0) parts.push(`grayscale(${f.grayscale})`);
  return parts.join(" ");
}

export interface TextAnnotation {
  id: string;
  text: string;
  /** 中心位置。動画の幅・高さに対する割合（0〜1） */
  x: number;
  y: number;
  /** 文字サイズ。動画の高さに対する割合 */
  size: number;
  color: string;
  /** 半透明の黒い下地を敷くか */
  background: boolean;
  /** 表示区間（クリップ内の秒）。省略時はクリップ全体 */
  from?: number;
  to?: number;
}

export const ANNOTATION_COLORS = ["#ffffff", "#f2b705", "#ff4d4f", "#4cc9f0", "#111111"];

export const ANNOTATION_FONT = "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif";

export interface ClipEdit {
  trim: TrimSelection;
  filters: FilterSettings;
  annotations: TextAnnotation[];
}

export function createDefaultEdit(durationSec: number, maxSec: number): ClipEdit {
  return {
    trim: { start: 0, length: Math.min(maxSec, durationSec) },
    filters: DEFAULT_FILTERS,
    annotations: [],
  };
}

export function clampTrim(sel: TrimSelection, durationSec: number, maxSec: number): TrimSelection {
  const length = Math.min(Math.max(1, sel.length), maxSec, durationSec);
  const start = Math.min(Math.max(0, sel.start), Math.max(0, durationSec - length));
  return { start, length };
}

/** 書き出し時に再エンコード（フレーム加工）が必要か */
export function hasEffects(edit: ClipEdit): boolean {
  return !isDefaultFilter(edit.filters) || edit.annotations.length > 0;
}

/** t（クリップ内の秒）にそのテキストを表示するか */
export function isAnnotationVisible(a: TextAnnotation, t: number): boolean {
  if (a.from !== undefined && t < a.from) return false;
  if (a.to !== undefined && t >= a.to) return false;
  return true;
}

/**
 * canvas にテキストを焼き込む。プレビュー（PreviewStage）の見た目と揃えること。
 * width / height は描画先のピクセルサイズ。
 */
export function drawAnnotations(
  ctx: CanvasRenderingContext2D,
  annotations: TextAnnotation[],
  t: number,
  width: number,
  height: number,
): void {
  for (const a of annotations) {
    if (!isAnnotationVisible(a, t)) continue;
    const fontPx = Math.max(8, a.size * height);
    const lines = a.text.split("\n");
    const lineHeight = fontPx * 1.3;
    const cx = a.x * width;
    const cy = a.y * height;
    const top = cy - (lines.length * lineHeight) / 2;

    ctx.save();
    ctx.font = `700 ${fontPx}px ${ANNOTATION_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";

    if (a.background) {
      const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const padX = fontPx * 0.4;
      const padY = fontPx * 0.2;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(
        cx - maxW / 2 - padX,
        top - padY,
        maxW + padX * 2,
        lines.length * lineHeight + padY * 2,
      );
    }

    lines.forEach((line, i) => {
      const y = top + lineHeight * (i + 0.5);
      if (!a.background) {
        ctx.lineWidth = fontPx * 0.12;
        ctx.strokeStyle = a.color === "#111111" ? "#ffffff" : "#000000";
        ctx.strokeText(line, cx, y);
      }
      ctx.fillStyle = a.color;
      ctx.fillText(line, cx, y);
    });
    ctx.restore();
  }
}

// 0.1 秒単位のタイムコード（例: 1:02.5、12:34.0）
export function formatTimecode(sec: number): string {
  const total = Math.max(0, sec);
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}
