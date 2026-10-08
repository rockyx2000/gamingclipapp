// クリップに映っているユーザーのタグ付け

import { and, eq, inArray } from "drizzle-orm";
import { MAX_CLIP_TAGS, USERNAME_PATTERN, type User } from "@gamingclipapp/shared";
import type { Db } from "./db/client";
import { clips, clipTags, users } from "./db/schema";
import { HttpError } from "./errors";
import { findUsersByUsernames, userColumns } from "./mentions";

export async function listTags(db: Db, clipId: string): Promise<User[]> {
  return db
    .select(userColumns)
    .from(clipTags)
    .innerJoin(users, eq(clipTags.userId, users.id))
    .where(eq(clipTags.clipId, clipId))
    .orderBy(clipTags.createdAt, users.username);
}

/**
 * タグ付けするユーザー名の一覧を検証して、ユーザーに解決する。
 * 投稿者本人は除く。見つからないユーザー名があれば 400。
 */
export async function resolveTagUsernames(db: Db, raw: unknown, uploaderId: string): Promise<User[]> {
  if (raw === undefined || raw === null || raw === "") return [];
  if (!Array.isArray(raw) || !raw.every((x) => typeof x === "string")) {
    throw new HttpError("タグ付けするユーザーの指定が不正です", 400);
  }
  const names = [...new Set(raw.map((n: string) => n.trim().replace(/^@/, "")).filter(Boolean))];
  const invalid = names.find((n) => !USERNAME_PATTERN.test(n));
  if (invalid) throw new HttpError(`ユーザー名が不正です: ${invalid}`, 400);
  if (names.length > MAX_CLIP_TAGS) {
    throw new HttpError(`タグ付けできるのは${MAX_CLIP_TAGS}人までです`, 400);
  }
  const found = await findUsersByUsernames(db, names);
  const foundNames = new Set(found.map((u) => u.username.toLowerCase()));
  const missing = names.find((n) => !foundNames.has(n.toLowerCase()));
  if (missing) throw new HttpError(`ユーザー @${missing} が見つかりません`, 400);
  return found.filter((u) => u.id !== uploaderId);
}

/** タグを入れ替える（投稿者だけ）。クリップが無ければ 404、投稿者でなければ 403 */
export async function setTags(db: Db, clipId: string, actorId: string, raw: unknown): Promise<User[]> {
  const [clip] = await db
    .select({ uploaderId: clips.uploaderId })
    .from(clips)
    .where(eq(clips.id, clipId));
  if (!clip) throw new HttpError("クリップが見つかりません", 404);
  if (clip.uploaderId !== actorId) throw new HttpError("タグを編集できるのは投稿者だけです", 403);
  const tagged = await resolveTagUsernames(db, raw, clip.uploaderId);
  await db.transaction(async (tx) => {
    await tx.delete(clipTags).where(eq(clipTags.clipId, clipId));
    if (tagged.length > 0) {
      await tx.insert(clipTags).values(tagged.map((u) => ({ clipId, userId: u.id })));
    }
  });
  return listTags(db, clipId);
}

/** タグを外す。投稿者か、タグ付けされた本人だけができる */
export async function removeTag(
  db: Db,
  clipId: string,
  userId: string,
  actorId: string,
): Promise<User[]> {
  const [clip] = await db
    .select({ uploaderId: clips.uploaderId })
    .from(clips)
    .where(eq(clips.id, clipId));
  if (!clip) throw new HttpError("クリップが見つかりません", 404);
  if (actorId !== clip.uploaderId && actorId !== userId) {
    throw new HttpError("このタグは外せません", 403);
  }
  await db.delete(clipTags).where(and(eq(clipTags.clipId, clipId), inArray(clipTags.userId, [userId])));
  return listTags(db, clipId);
}
