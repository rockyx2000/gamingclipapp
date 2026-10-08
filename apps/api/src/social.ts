// いいね・コメントの読み取り

import { and, desc, eq, inArray } from "drizzle-orm";
import type { ClipWithGame, Comment } from "@gamingclipapp/shared";
import type { Db } from "./db/client";
import { clipComments, clipLikes, clips, users } from "./db/schema";
import { listClipsByIds } from "./queries";

/** userId がいいねしたクリップ（いいねが新しい順） */
export async function listLikedClips(db: Db, userId: string): Promise<ClipWithGame[]> {
  const rows = await db
    .select({ clipId: clipLikes.clipId })
    .from(clipLikes)
    .where(eq(clipLikes.userId, userId))
    .orderBy(desc(clipLikes.likedAt), desc(clipLikes.clipId));
  return listClipsByIds(
    db,
    rows.map((r) => r.clipId),
  );
}

/** clipIds のうち userId がいいねしているもの（フィード表示用） */
export async function likedClipIds(db: Db, userId: string, clipIds: string[]): Promise<string[]> {
  if (clipIds.length === 0) return [];
  const rows = await db
    .select({ clipId: clipLikes.clipId })
    .from(clipLikes)
    .where(and(eq(clipLikes.userId, userId), inArray(clipLikes.clipId, clipIds)));
  const liked = new Set(rows.map((r) => r.clipId));
  return clipIds.filter((id) => liked.has(id));
}

/** 新しい順。クリップが無ければ undefined */
export async function listClipComments(db: Db, clipId: string): Promise<Comment[] | undefined> {
  const [clip] = await db.select({ id: clips.id }).from(clips).where(eq(clips.id, clipId));
  if (!clip) return undefined;
  const rows = await db
    .select({
      id: clipComments.id,
      body: clipComments.body,
      createdAt: clipComments.createdAt,
      author: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(clipComments)
    .innerJoin(users, eq(clipComments.authorId, users.id))
    .where(eq(clipComments.clipId, clipId))
    .orderBy(desc(clipComments.createdAt), desc(clipComments.id));
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
