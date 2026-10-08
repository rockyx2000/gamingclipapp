// 動画・サムネイルのストレージ抽象化層
// 現在はローカルディスク実装のみ。自宅 K8s では PersistentVolume を DATA_DIR にマウントして
// そのまま使え、Cloudflare R2 へ移すときは ClipStorage の別実装を足して
// getStorage() の返り値を差し替えるだけで済むようにしている。

import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { CONTENT_TYPES, UPLOAD_DIR } from "./config";

export interface StoredObjectInfo {
  size: number;
  contentType: string;
}

export interface ByteRange {
  start: number;
  end: number;
}

export interface ClipStorage {
  /** body を key に保存する */
  put(key: string, body: ReadableStream<Uint8Array>): Promise<void>;
  /** サイズと Content-Type を返す。存在しなければ undefined */
  head(key: string): Promise<StoredObjectInfo | undefined>;
  /** 内容を読み出す。range を渡すとその範囲だけ返す（動画のシーク用） */
  read(key: string, range?: ByteRange): ReadableStream<Uint8Array>;
  /** key 配下（ディレクトリ相当）をまとめて削除する */
  deletePrefix(prefix: string): Promise<void>;
  /** ブラウザからアクセスする URL（web の /api/media から api へ転送される） */
  publicUrl(key: string): string;
}

// key は "<clipId>/video.mp4" のような形式のみ許可する（パストラバーサル防止）
const KEY_PATTERN = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_.-]+)*$/;

export function isValidKey(key: string): boolean {
  return KEY_PATTERN.test(key) && !key.split("/").some((p) => p === "..");
}

class LocalDiskStorage implements ClipStorage {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    if (!isValidKey(key)) throw new Error(`不正なストレージキーです: ${key}`);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error(`不正なストレージキーです: ${key}`);
    return full;
  }

  async put(key: string, body: ReadableStream<Uint8Array>): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    try {
      await pipeline(Readable.fromWeb(body as NodeReadableStream), createWriteStream(full));
    } catch (err) {
      await unlink(full).catch(() => {});
      throw err;
    }
  }

  async head(key: string): Promise<StoredObjectInfo | undefined> {
    let full: string;
    try {
      full = this.resolve(key);
    } catch {
      return undefined;
    }
    try {
      const info = await stat(full);
      if (!info.isFile()) return undefined;
      const contentType = CONTENT_TYPES[path.extname(full).toLowerCase()] ?? "application/octet-stream";
      return { size: info.size, contentType };
    } catch {
      return undefined;
    }
  }

  read(key: string, range?: ByteRange): ReadableStream<Uint8Array> {
    return Readable.toWeb(createReadStream(this.resolve(key), range)) as ReadableStream<Uint8Array>;
  }

  async deletePrefix(prefix: string): Promise<void> {
    await rm(this.resolve(prefix), { recursive: true, force: true });
  }

  publicUrl(key: string): string {
    return `/api/media/${key}`;
  }
}

let storage: ClipStorage | undefined;

export function getStorage(): ClipStorage {
  storage ??= new LocalDiskStorage(UPLOAD_DIR);
  return storage;
}
