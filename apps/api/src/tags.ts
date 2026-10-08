// クリップの映像に付けるユーザーのタグ（Instagram のように、映像の上の位置つき）

import { and, eq, inArray } from "drizzle-orm";
import {
  MAX_CLIP_TAGS,
  USERNAME_PATTERN,
  type ClipTag,
  type ClipWithGame,
} from "@gamingclipapp/shared";
import type { Db } from "./db/client";
import { clips, clipTags, users } from "./db/schema";
import { HttpError } from "./errors";
import { findUsersByUsernames, userColumns } from "./mentions";

export async function listTags(db: Db, clipId: string): Promise<ClipTag[]> {
  const rows = await db
    .select({ user: userColumns, x: clipTags.x, y: clipTags.y })
    .from(clipTags)
    .innerJoin(users, eq(clipTags.userId, users.id))
    .where(eq(clipTags.clipId, clipId))
    .orderBy(clipTags.createdAt, users.username);
  return rows;
}

/** 複数のクリップにタグを付けて返す（一覧でも、映像の上にタグを出せるように 1 回の問い合わせで引く） */
export async function withTags<T extends ClipWithGame>(db: Db, list: T[]): Promise<T[]> {
  if (list.length === 0) return list;
  const rows = await db
    .select({ clipId: clipTags.clipId, user: userColumns, x: clipTags.x, y: clipTags.y })
    .from(clipTags)
    .innerJoin(users, eq(clipTags.userId, users.id))
    .where(
      inArray(
        clipTags.clipId,
        list.map((c) => c.id),
      ),
    )
    .orderBy(clipTags.createdAt, users.username);
  const byClip = new Map<string, ClipTag[]>();
  for (const { clipId, ...tag } of rows) {
    byClip.set(clipId, [...(byClip.get(clipId) ?? []), tag]);
  }
  return list.map((c) => ({ ...c, tags: byClip.get(c.id) ?? [] }));
}

const inUnitRange = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;

/**
 * タグ（[{ username, x, y }]）を検証して、ユーザーに解決する。
 * 投稿者本人は除く。同じユーザーが複数あれば先のものだけ。
 * 見つからないユーザー名や、0〜1 の外の位置があれば 400。
 */
export async function resolveTags(
  db: Db,
  raw: unknown,
  uploaderId: string,
): Promise<{ userId: string; x: number; y: number }[]> {
  if (raw === undefined || raw === null || raw === "") return [];
  if (!Array.isArray(raw)) throw new HttpError("タグの指定が不正です", 400);

  const wanted: { username: string; x: number; y: number }[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "object" || item === null) throw new HttpError("タグの指定が不正です", 400);
    const { username, x, y } = item as Record<string, unknown>;
    if (typeof username !== "string") throw new HttpError("タグの指定が不正です", 400);
    const name = username.trim().replace(/^@/, "");
    if (!USERNAME_PATTERN.test(name)) throw new HttpError(`ユーザー名が不正です: ${name}`, 400);
    if (!inUnitRange(x) || !inUnitRange(y)) throw new HttpError("タグの位置が不正です", 400);
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    wanted.push({ username: name, x, y });
  }
  if (wanted.length > MAX_CLIP_TAGS) {
    throw new HttpError(`タグ付けできるのは${MAX_CLIP_TAGS}人までです`, 400);
  }

  const found = await findUsersByUsernames(db, wanted.map((w) => w.username));
  const byName = new Map(found.map((u) => [u.username.toLowerCase(), u]));
  const result: { userId: string; x: number; y: number }[] = [];
  for (const w of wanted) {
    const user = byName.get(w.username.toLowerCase());
    if (!user) throw new HttpError(`ユーザー @${w.username} が見つかりません`, 400);
    if (user.id !== uploaderId) result.push({ userId: user.id, x: w.x, y: w.y });
  }
  return result;
}

/** タグを入れ替える（投稿者だけ）。クリップが無ければ 404、投稿者でなければ 403 */
export async function setTags(db: Db, clipId: string, actorId: string, raw: unknown): Promise<ClipTag[]> {
  const [clip] = await db
    .select({ uploaderId: clips.uploaderId })
    .from(clips)
    .where(eq(clips.id, clipId));
  if (!clip) throw new HttpError("クリップが見つかりません", 404);
  if (clip.uploaderId !== actorId) throw new HttpError("タグを編集できるのは投稿者だけです", 403);
  const tagged = await resolveTags(db, raw, clip.uploaderId);
  await db.transaction(async (tx) => {
    await tx.delete(clipTags).where(eq(clipTags.clipId, clipId));
    if (tagged.length > 0) {
      await tx.insert(clipTags).values(tagged.map((t) => ({ clipId, ...t })));
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
): Promise<ClipTag[]> {
  const [clip] = await db
    .select({ uploaderId: clips.uploaderId })
    .from(clips)
    .where(eq(clips.id, clipId));
  if (!clip) throw new HttpError("クリップが見つかりません", 404);
  if (actorId !== clip.uploaderId && actorId !== userId) {
    throw new HttpError("このタグは外せません", 403);
  }
  await db.delete(clipTags).where(and(eq(clipTags.clipId, clipId), eq(clipTags.userId, userId)));
  return listTags(db, clipId);
}
