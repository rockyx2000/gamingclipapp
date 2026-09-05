// ブラウザ側で動画を調べるユーティリティ（クライアント専用）
// <video> 要素と canvas だけで完結し、ファイル全体をメモリに載せない
// （Object URL からの再生はブラウザがストリーミングで読む）。

export interface VideoMeta {
  durationSec: number;
  width: number;
  height: number;
}

const THUMBNAIL_WIDTH = 640;

function createProbeElement(source: Blob): { video: HTMLVideoElement; dispose: () => void } {
  const url = URL.createObjectURL(source);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  return {
    video,
    dispose: () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    },
  };
}

function waitForEvent(target: HTMLVideoElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = () => {
      cleanup();
      reject(new Error("動画を読み込めませんでした"));
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      target.removeEventListener(event, onEvent);
      target.removeEventListener("error", onError);
    };
    target.addEventListener(event, onEvent, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

/** 長さと解像度を読み取る */
export async function readVideoMeta(source: Blob): Promise<VideoMeta> {
  const { video, dispose } = createProbeElement(source);
  try {
    await waitForEvent(video, "loadedmetadata");
    return {
      durationSec: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    };
  } finally {
    dispose();
  }
}

function drawFrame(
  video: HTMLVideoElement,
  targetWidth: number,
  type: "image/jpeg" | "image/webp",
  quality: number,
): Promise<Blob | null> {
  const scale = Math.min(1, targetWidth / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  const clamped = Math.min(Math.max(0, t), Math.max(0, video.duration - 0.05));
  if (Math.abs(video.currentTime - clamped) < 0.001 && video.readyState >= 2) return;
  const seeked = waitForEvent(video, "seeked");
  video.currentTime = clamped;
  await seeked;
}

/** サムネイル用に 1 フレームだけ切り出す */
export async function captureThumbnail(source: Blob, time: number): Promise<Blob | null> {
  const { video, dispose } = createProbeElement(source);
  try {
    await waitForEvent(video, "loadedmetadata");
    await seekTo(video, time);
    return await drawFrame(video, THUMBNAIL_WIDTH, "image/jpeg", 0.85);
  } finally {
    dispose();
  }
}

/**
 * タイムライン用のフレームキャッシュ。
 * 1 つの <video> 要素でシークを繰り返し、要求された時刻のフレームを小さな画像にして保持する。
 * 表示中の範囲だけを要求すれば、1 時間の動画でも必要な分しか作らない。
 * 直近に要求されたものから処理する（スクロール先を優先するため）。
 */
export class FrameCache {
  private urls = new Map<number, string>();
  private queue: number[] = [];
  private queued = new Set<number>();
  private listeners = new Set<() => void>();
  private element: { video: HTMLVideoElement; dispose: () => void; ready: Promise<void> } | null =
    null;
  private running = false;

  constructor(
    private readonly source: Blob,
    private readonly frameHeight = 56,
  ) {}

  // <video> 要素は最初の要求時に作る。dispose 後にまた使われたら作り直す
  // （React Strict Mode の「マウント→解除→再マウント」でも動くようにするため）
  private ensureElement() {
    if (!this.element) {
      const { video, dispose } = createProbeElement(this.source);
      this.element = {
        video,
        dispose,
        ready: waitForEvent(video, "loadedmetadata").catch(() => {}),
      };
    }
    return this.element;
  }

  private static key(time: number): number {
    return Math.round(time * 1000);
  }

  /** 生成済みならその画像の URL */
  get(time: number): string | undefined {
    return this.urls.get(FrameCache.key(time));
  }

  /** 必要な時刻を要求する。生成が終わると subscribe のコールバックが呼ばれる */
  request(times: number[]): void {
    for (const t of times) {
      const key = FrameCache.key(t);
      if (this.urls.has(key) || this.queued.has(key)) continue;
      this.queued.add(key);
      this.queue.push(key);
    }
    void this.pump();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async pump(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const element = this.ensureElement();
    await element.ready;
    while (this.queue.length > 0 && this.element === element) {
      const key = this.queue.pop()!;
      this.queued.delete(key);
      try {
        const { video } = element;
        await seekTo(video, key / 1000);
        if (this.element !== element) break;
        const width = Math.round(
          (this.frameHeight * video.videoWidth) / Math.max(1, video.videoHeight),
        );
        const blob = await drawFrame(video, width, "image/webp", 0.7);
        if (this.element !== element) break;
        if (blob) {
          this.urls.set(key, URL.createObjectURL(blob));
          this.listeners.forEach((l) => l());
        }
      } catch {
        // このフレームは諦めて次へ
      }
    }
    this.running = false;
  }

  /** 画像と <video> 要素を解放する。以後また request されれば作り直す */
  dispose(): void {
    this.queue = [];
    this.queued.clear();
    this.urls.forEach((url) => URL.revokeObjectURL(url));
    this.urls.clear();
    this.element?.dispose();
    this.element = null;
  }
}
