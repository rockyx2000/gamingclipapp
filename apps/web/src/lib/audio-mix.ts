// BGM と元動画の音声を混ぜて 1 本の AudioBuffer にする（クライアント専用）。
// 書き出し（video-trim.ts）から呼び出し、できあがった音声を動画に載せ直す。
//
// 元動画の音声は mediabunny で切り出す範囲だけを取り出すため、
// 1 時間の動画でも読み込むのは最大 1 分ぶんで済む。
// BGM は音楽ファイル（数 MB 程度）を想定し、まるごと復号する。

import { ALL_FORMATS, AudioBufferSink, BlobSource, Input, type InputAudioTrack } from "mediabunny";
import { BGM_FADE_SEC, type ClipEdit } from "./video-edit";

/** 元動画に音声が無いときに使うサンプルレート */
const DEFAULT_SAMPLE_RATE = 48000;

/** 書き出す音声のチャンネル数 */
const OUTPUT_CHANNELS = 2;

/** OfflineAudioContext が受け付けるサンプルレートの範囲 */
const MIN_SAMPLE_RATE = 8000;
const MAX_SAMPLE_RATE = 96000;

/** BGM に使えるファイルの MIME タイプ */
export const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
  "audio/x-flac",
];

/** BGM として受け付けるファイルサイズの上限（バイト） */
export const MAX_BGM_BYTES = 30 * 1024 * 1024;

export function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/") || AUDIO_TYPES.includes(file.type);
}

/** このブラウザで音声を混ぜられるか */
export function canMixAudio(): boolean {
  return typeof OfflineAudioContext !== "undefined";
}

/** 音源ファイルの長さ（秒）を読む */
export function readAudioDuration(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.removeAttribute("src");
      audio.load();
    };
    audio.preload = "metadata";
    audio.addEventListener(
      "loadedmetadata",
      () => {
        const duration = audio.duration;
        cleanup();
        if (Number.isFinite(duration) && duration > 0) {
          resolve(duration);
        } else {
          reject(new Error("音源の長さを読み取れませんでした"));
        }
      },
      { once: true },
    );
    audio.addEventListener(
      "error",
      () => {
        cleanup();
        reject(new Error("この音声ファイルは読み込めませんでした"));
      },
      { once: true },
    );
    audio.src = url;
  });
}

function clampSampleRate(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return DEFAULT_SAMPLE_RATE;
  return Math.min(MAX_SAMPLE_RATE, Math.max(MIN_SAMPLE_RATE, Math.round(rate)));
}

/** 音声トラックの情報。読めない場合に例外を投げるプロパティがあるため個別に囲む */
function readTrackInfo(track: InputAudioTrack): { sampleRate: number; channels: number } {
  let sampleRate = DEFAULT_SAMPLE_RATE;
  let channels = OUTPUT_CHANNELS;
  try {
    sampleRate = track.sampleRate;
  } catch {
    // 既定値のまま使う
  }
  try {
    channels = track.numberOfChannels;
  } catch {
    // 既定値のまま使う
  }
  return { sampleRate: clampSampleRate(sampleRate), channels: Math.max(1, channels) };
}

/**
 * 元動画の音声のうち start から length 秒ぶんを 1 本の AudioBuffer にまとめる。
 * 音が 1 サンプルも取れなければ null。
 */
async function readSourceAudio(
  ctx: OfflineAudioContext,
  track: InputAudioTrack,
  start: number,
  length: number,
  channels: number,
): Promise<AudioBuffer | null> {
  const rate = ctx.sampleRate;
  const frames = Math.max(1, Math.ceil(length * rate));
  if (!(await track.canDecode())) return null;

  const out = ctx.createBuffer(channels, frames, rate);
  let wrote = false;

  for await (const { buffer, timestamp } of new AudioBufferSink(track).buffers(
    start,
    start + length,
  )) {
    // timestamp は元動画の絶対時間。切り出しの先頭を 0 として詰め直す
    const offset = Math.round((timestamp - start) * rate);
    const srcStart = offset < 0 ? -offset : 0;
    const dstStart = Math.max(0, offset);
    const count = Math.min(buffer.length - srcStart, frames - dstStart);
    if (count <= 0) {
      if (dstStart >= frames) break;
      continue;
    }
    for (let c = 0; c < channels; c++) {
      const source = buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1));
      out.copyToChannel(source.subarray(srcStart, srcStart + count), c, dstStart);
    }
    wrote = true;
  }

  return wrote ? out : null;
}

/**
 * 切り出す範囲の音声を作る。
 * 元動画の音声と BGM を重ね、それぞれの音量を掛けて 1 本にまとめる。
 * 鳴らすものが何も無ければ null（音声トラックを作らない）。
 */
export async function buildMixedAudio(
  videoFile: Blob,
  edit: ClipEdit,
): Promise<AudioBuffer | null> {
  const { trim, originalVolume, bgm } = edit;
  const input = new Input({ source: new BlobSource(videoFile), formats: ALL_FORMATS });

  try {
    let track: InputAudioTrack | null = null;
    try {
      track = await input.getPrimaryAudioTrack();
    } catch {
      track = null;
    }

    const info = track ? readTrackInfo(track) : null;
    const rate = info ? info.sampleRate : DEFAULT_SAMPLE_RATE;
    const frames = Math.max(1, Math.ceil(trim.length * rate));
    const ctx = new OfflineAudioContext(OUTPUT_CHANNELS, frames, rate);
    let hasSound = false;

    if (track && info && originalVolume > 0) {
      const original = await readSourceAudio(ctx, track, trim.start, trim.length, info.channels);
      if (original) {
        const node = ctx.createBufferSource();
        node.buffer = original;
        const gain = ctx.createGain();
        gain.gain.value = originalVolume;
        node.connect(gain).connect(ctx.destination);
        node.start(0);
        hasSound = true;
      }
    }

    if (bgm && bgm.volume > 0) {
      const decoded = await ctx.decodeAudioData(await bgm.file.arrayBuffer()).catch(() => null);
      if (!decoded) {
        throw new Error("BGM を読み込めませんでした。別の音声ファイルをお試しください。");
      }
      const from = Math.max(0, Math.min(bgm.from, trim.length));
      const to = Math.max(from, Math.min(bgm.to, trim.length));
      const offset = Math.max(0, Math.min(bgm.offset, Math.max(0, decoded.duration - 0.05)));
      if (to - from > 0.01) {
        const node = ctx.createBufferSource();
        node.buffer = decoded;
        if (bgm.loop) {
          node.loop = true;
          node.loopStart = offset;
          node.loopEnd = decoded.duration;
        }
        const gain = ctx.createGain();
        // 途中でぶつ切りにならないよう、終わりぎわを短くしぼる
        const fadeStart = Math.max(from, to - BGM_FADE_SEC);
        gain.gain.setValueAtTime(bgm.volume, 0);
        gain.gain.setValueAtTime(bgm.volume, fadeStart);
        gain.gain.linearRampToValueAtTime(0, to);
        node.connect(gain).connect(ctx.destination);
        node.start(from, offset, to - from);
        hasSound = true;
      }
    }

    if (!hasSound) return null;
    return await ctx.startRendering();
  } finally {
    input.dispose();
  }
}
