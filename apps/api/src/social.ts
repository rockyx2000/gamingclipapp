// いいね・コメントの読み取り

import { and, desc, eq, inArray } from "drizzle-orm";
import { COMMENTS_PAGE_SIZE, type ClipWithGame, type CommentPage } from "@gamingclipapp/shared";
import type { Db } from "./db/client";
import { clipComments, clipLikes, clips, users } from "./db/schema";
import { beforeCursor, encodeCursor, type CommentCursor } from "./comment-page";
import { findUsersByIds, userColumns } from "./mentions";
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

/** 新しい順に 1 ページ分。クリップが無ければ undefined */
export async function listClipComments(
  db: Db,
  clipId: string,
  options: { limit?: number; cursor?: CommentCursor } = {},
): Promise<CommentPage | undefined> {
  const [clip] = await db.select({ id: clips.id }).from(clips).where(eq(clips.id, clipId));
  if (!clip) return undefined;
  const limit = options.limit ?? COMMENTS_PAGE_SIZE;
  const rows = await db
    .select({
      id: clipComments.id,
      body: clipComments.body,
      createdAt: clipComments.createdAt,
      mentions: clipComments.mentions,
      author: userColumns,
    })
    .from(clipComments)
    .innerJoin(users, eq(clipComments.authorId, users.id))
    .where(and(eq(clipComments.clipId, clipId), beforeCursor(clipComments.createdAt, clipComments.id, options.cursor)))
    .orderBy(desc(clipComments.createdAt), desc(clipComments.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const mentioned = await findUsersByIds(db, page.flatMap((r) => r.mentions));
  return {
    comments: page.map((r) => ({
      id: r.id,
      author: r.author,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      mentions: r.mentions.flatMap((id) => mentioned.get(id) ?? []),
    })),
    nextCursor: rows.length > limit ? encodeCursor(page[page.length - 1]) : null,
  };
}
