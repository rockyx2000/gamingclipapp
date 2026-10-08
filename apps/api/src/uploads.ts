// クリップの投稿（動画とサムネイルの保存、メタデータの登録）

import { eq } from "drizzle-orm";
import { MAX_CLIP_DURATION_SEC, type ClipWithGame, type User } from "@gamingclipapp/shared";
import {
  IMAGE_EXTENSIONS,
  MAX_THUMBNAIL_BYTES,
  MAX_UPLOAD_BYTES,
  VIDEO_EXTENSIONS,
} from "./config";
import type { Db } from "./db/client";
import { clips, games } from "./db/schema";
import { HttpError } from "./errors";
import { getClip } from "./queries";
import { getStorage } from "./storage";

const mb = (bytes: number) => Math.floor(bytes / 1024 / 1024);

/**
 * multipart/form-data のクリップ投稿を検証して保存する。
 *   video       動画ファイル（必須。mp4 / webm / mov）
 *   thumbnail   サムネイル画像（任意）
 *   title, description, gameId, durationSec
 * 注意: formData() はファイル全体をメモリに読み込む。Cloudflare R2 へ移すときは、
 * 署名付き URL でブラウザから直接送る方式に切り替える（docs/architecture.md）。
 */
export async function createClipFromForm(db: Db, form: FormData, uploader: User): Promise<ClipWithGame> {
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const gameId = String(form.get("gameId") ?? "");
  const duration = Math.round(Number(form.get("durationSec")));
  const video = form.get("video");
  const thumbnail = form.get("thumbnail");

  if (!title || !gameId) throw new HttpError("タイトルとゲームは必須です", 400);
  const [game] = await db.select({ id: games.id }).from(games).where(eq(games.id, gameId));
  if (!game) throw new HttpError("存在しないゲームです", 400);
  if (!Number.isFinite(duration) || duration < 1) throw new HttpError("動画の長さが不正です", 400);
  if (duration > MAX_CLIP_DURATION_SEC) {
    throw new HttpError(`動画の長さは最大${MAX_CLIP_DURATION_SEC}秒です`, 400);
  }
  if (!(video instanceof File) || video.size === 0) {
    throw new HttpError("動画ファイルを選択してください", 400);
  }
  const ext = VIDEO_EXTENSIONS[video.type];
  if (!ext) throw new HttpError("対応していない動画形式です（mp4 / webm / mov）", 400);
  if (video.size > MAX_UPLOAD_BYTES) {
    throw new HttpError(`ファイルサイズは${mb(MAX_UPLOAD_BYTES)}MB以下にしてください`, 413);
  }

  // サムネイルは任意。指定が無ければプレースホルダー画像を使う
  let thumbExt: string | null = null;
  if (thumbnail instanceof File && thumbnail.size > 0) {
    thumbExt = IMAGE_EXTENSIONS[thumbnail.type] ?? null;
    if (!thumbExt) throw new HttpError("サムネイルは JPEG / PNG / WebP の画像を選んでください", 400);
    if (thumbnail.size > MAX_THUMBNAIL_BYTES) {
      throw new HttpError(`サムネイルは${mb(MAX_THUMBNAIL_BYTES)}MB以下にしてください`, 413);
    }
  }

  const storage = getStorage();
  const id = crypto.randomUUID();
  const videoKey = `${id}/video${ext}`;
  try {
    await storage.put(videoKey, video.stream());
    let thumbnailUrl: string;
    if (thumbnail instanceof File && thumbExt) {
      const thumbKey = `${id}/thumb${thumbExt}`;
      await storage.put(thumbKey, thumbnail.stream());
      thumbnailUrl = storage.publicUrl(thumbKey);
    } else {
      thumbnailUrl = `https://picsum.photos/seed/${id}/640/360`;
    }
    await db.insert(clips).values({
      id,
      title,
      description,
      videoUrl: storage.publicUrl(videoKey),
      thumbnailUrl,
      durationSec: duration,
      mimeType: video.type,
      sizeBytes: video.size,
      gameId,
      uploaderId: uploader.id,
      views: 0,
      likes: 0,
      createdAt: new Date(),
    });
  } catch (err) {
    // 途中で失敗したら保存済みのファイルを残さない
    await storage.deletePrefix(id).catch(() => {});
    console.error("クリップの保存に失敗しました", err);
    throw new HttpError("クリップの保存に失敗しました", 500);
  }
  const clip = await getClip(db, id);
  if (!clip) throw new HttpError("クリップの保存に失敗しました", 500);
  return clip;
}
