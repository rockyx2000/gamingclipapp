// 投稿したクリップの編集（タイトル・説明・ゲーム・サムネイル）と削除。投稿者だけができる。
// 映像そのもの（編集で焼き込んだフィルターやテキストを含む）は、投稿後には変えられない。

import { eq } from "drizzle-orm";
import {
  MAX_CLIP_DESCRIPTION_LENGTH,
  MAX_CLIP_TITLE_LENGTH,
  type ClipWithGame,
} from "@gamingclipapp/shared";
import { IMAGE_EXTENSIONS, MAX_THUMBNAIL_BYTES } from "./config";
import type { Db } from "./db/client";
import { clips, games } from "./db/schema";
import { HttpError } from "./errors";
import { getClip } from "./queries";
import { getStorage } from "./storage";

/** 編集できるクリップを取る。無ければ 404、投稿者でなければ 403 */
async function ownedClip(db: Db, clipId: string, actorId: string) {
  const [clip] = await db
    .select({
      uploaderId: clips.uploaderId,
      thumbnailUrl: clips.thumbnailUrl,
    })
    .from(clips)
    .where(eq(clips.id, clipId));
  if (!clip) throw new HttpError("クリップが見つかりません", 404);
  if (clip.uploaderId !== actorId) throw new HttpError("編集できるのは投稿者だけです", 403);
  return clip;
}

export interface ClipPatch {
  title?: unknown;
  description?: unknown;
  gameId?: unknown;
}

/** タイトル・説明・ゲームを変える。渡したものだけ変わる */
export async function updateClip(
  db: Db,
  clipId: string,
  actorId: string,
  patch: ClipPatch,
): Promise<ClipWithGame> {
  await ownedClip(db, clipId, actorId);
  const set: Partial<typeof clips.$inferInsert> = {};

  if (patch.title !== undefined) {
    const title = typeof patch.title === "string" ? patch.title.trim() : "";
    if (!title) throw new HttpError("タイトルを入力してください", 400);
    if (title.length > MAX_CLIP_TITLE_LENGTH) {
      throw new HttpError(`タイトルは${MAX_CLIP_TITLE_LENGTH}文字以内にしてください`, 400);
    }
    set.title = title;
  }
  if (patch.description !== undefined) {
    if (typeof patch.description !== "string") throw new HttpError("説明が不正です", 400);
    const description = patch.description.trim();
    if (description.length > MAX_CLIP_DESCRIPTION_LENGTH) {
      throw new HttpError(`説明は${MAX_CLIP_DESCRIPTION_LENGTH}文字以内にしてください`, 400);
    }
    set.description = description;
  }
  if (patch.gameId !== undefined) {
    const gameId = typeof patch.gameId === "string" ? patch.gameId : "";
    const [game] = await db.select({ id: games.id }).from(games).where(eq(games.id, gameId));
    if (!game) throw new HttpError("存在しないゲームです", 400);
    set.gameId = gameId;
  }

  if (Object.keys(set).length > 0) {
    await db.update(clips).set(set).where(eq(clips.id, clipId));
  }
  const clip = await getClip(db, clipId);
  if (!clip) throw new HttpError("クリップが見つかりません", 404);
  return clip;
}

/**
 * サムネイル画像を差し替える。配信は長期キャッシュ（immutable）なので、
 * ファイル名を毎回新しくして URL を変える。古い画像は、保存先にあるものなら消す。
 */
export async function replaceThumbnail(
  db: Db,
  clipId: string,
  actorId: string,
  file: unknown,
): Promise<ClipWithGame> {
  const current = await ownedClip(db, clipId, actorId);
  if (!(file instanceof File) || file.size === 0) {
    throw new HttpError("サムネイル画像を選択してください", 400);
  }
  const ext = IMAGE_EXTENSIONS[file.type];
  if (!ext) throw new HttpError("サムネイルは JPEG / PNG / WebP の画像を選んでください", 400);
  if (file.size > MAX_THUMBNAIL_BYTES) {
    throw new HttpError(`サムネイルは${Math.floor(MAX_THUMBNAIL_BYTES / 1024 / 1024)}MB以下にしてください`, 413);
  }

  const storage = getStorage();
  const key = `${clipId}/thumb-${crypto.randomUUID().slice(0, 8)}${ext}`;
  await storage.put(key, file.stream());
  try {
    await db.update(clips).set({ thumbnailUrl: storage.publicUrl(key) }).where(eq(clips.id, clipId));
  } catch (err) {
    await storage.deletePrefix(key).catch(() => {});
    throw err;
  }

  // 古い画像（保存先にあるものだけ。外部の画像 URL は触らない）
  const prefix = storage.publicUrl("");
  if (current.thumbnailUrl.startsWith(prefix)) {
    await storage.deletePrefix(current.thumbnailUrl.slice(prefix.length)).catch(() => {});
  }
  const clip = await getClip(db, clipId);
  if (!clip) throw new HttpError("クリップが見つかりません", 404);
  return clip;
}

/** クリップを消す。いいね・コメント・タグ・再生記録・プレイリストの中身は、DB 側で一緒に消える */
export async function deleteClip(db: Db, clipId: string, actorId: string): Promise<void> {
  await ownedClip(db, clipId, actorId);
  await db.delete(clips).where(eq(clips.id, clipId));
  // ファイルは DB のあとに消す（失敗しても、見える状態が残らないように）
  await getStorage().deletePrefix(clipId).catch((err) => {
    console.error("クリップのファイルを消せませんでした", clipId, err);
  });
}
