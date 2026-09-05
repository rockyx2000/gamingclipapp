// ブラウザ内で動画の一部を切り出し、フィルターとテキストを焼き込んで MP4 に書き出す（クライアント専用）
// mediabunny の Conversion を使い、入力はストリーミングで読むため
// 1 時間の動画でもファイル全体をメモリに載せない。出力（最大 1 分）だけをメモリに持つ。
// - 開始位置がファイル先頭でない、またはフィルター/テキストがある場合は映像を WebCodecs で再エンコードする
// - 先頭からの切り出しで加工がなければパケットコピーで高速

import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  canEncodeVideo,
  type ConversionVideoOptions,
  type VideoSample,
} from "mediabunny";
import { cssFilter, drawAnnotations, hasEffects, isDefaultFilter, type ClipEdit } from "./video-edit";
import type { VideoMeta } from "./video-probe";

/** 出力の最大幅。これより大きい動画は縮小して書き出し時間を抑える */
const MAX_OUTPUT_WIDTH = 1920;

/** このブラウザで切り出し（WebCodecs エンコード）ができるか */
export async function canTrimInBrowser(): Promise<boolean> {
  if (typeof VideoEncoder === "undefined") return false;
  try {
    return await canEncodeVideo("avc");
  } catch {
    return false;
  }
}

/** canvas がフィルター描画（ctx.filter）に対応しているか。Safari は非対応 */
export function canBakeFilters(): boolean {
  return (
    typeof CanvasRenderingContext2D !== "undefined" &&
    "filter" in CanvasRenderingContext2D.prototype
  );
}

/** 各フレームにフィルターとテキストを描く process コールバックを作る */
function createFrameProcessor(edit: ClipEdit) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas を初期化できませんでした");
  const filter = cssFilter(edit.filters);
  const applyFilter = !isDefaultFilter(edit.filters) && canBakeFilters();

  return (sample: VideoSample) => {
    const w = sample.displayWidth;
    const h = sample.displayHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.filter = applyFilter ? filter : "none";
    ctx.drawImage(sample.toCanvasImageSource(), 0, 0, w, h);
    ctx.filter = "none";
    // process に渡る timestamp は切り出し後の相対時間（0 始まり）
    drawAnnotations(ctx, edit.annotations, sample.timestamp, w, h);
    return canvas;
  };
}

/**
 * file を edit の内容で書き出す。
 * onProgress は 0〜1 の進捗を受け取る。
 */
export async function exportClip(
  file: Blob,
  edit: ClipEdit,
  meta: VideoMeta,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });
  const output = new Output({
    // moov を先頭に置き、ダウンロードしながら再生できるようにする
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });

  const video: ConversionVideoOptions = {};
  const outputWidth = Math.min(meta.width, MAX_OUTPUT_WIDTH);
  if (meta.width > MAX_OUTPUT_WIDTH) {
    video.width = MAX_OUTPUT_WIDTH;
  }
  if (hasEffects(edit)) {
    // テキストのフォントを読み込んでから描画する
    await document.fonts.load("700 32px 'Noto Sans JP'").catch(() => {});
    video.process = createFrameProcessor(edit);
    video.processedWidth = outputWidth;
    video.processedHeight = Math.round((meta.height * outputWidth) / Math.max(1, meta.width));
  }

  const conversion = await Conversion.init({
    input,
    output,
    video,
    trim: { start: edit.trim.start, end: edit.trim.start + edit.trim.length },
    showWarnings: false,
  });

  if (!conversion.isValid) {
    const reasons = conversion.discardedTracks
      .map((t) => `${t.track.type}: ${t.reason}`)
      .join(", ");
    throw new Error(`この動画は変換できません（${reasons}）`);
  }

  if (onProgress) {
    conversion.onProgress = (progress) => onProgress(progress);
  }
  await conversion.execute();

  const buffer = output.target.buffer;
  if (!buffer) {
    throw new Error("動画の書き出しに失敗しました");
  }
  return new Blob([buffer], { type: "video/mp4" });
}
