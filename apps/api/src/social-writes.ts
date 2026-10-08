// いいね・再生の記録・クリップへのコメントの書き込み

import { and, eq, lt, lte, sql } from "drizzle-orm";
import type { Comment, User } from "@gamingclipapp/shared";
import type { Db } from "./db/client";
import { clipComments, clipLikes, clips, clipViewDedupe, clipViewsHourly } from "./db/schema";
import { VIEW_DEDUPE_MS } from "./limits";
import { getClip } from "./queries";

/** いいねを付ける / 外す。冪等で、同じ操作を繰り返しても数は変わらない。クリップが無ければ undefined */
export async function setLike(
  db: Db,
  clipId: string,
  userId: string,
  liked: boolean,
): Promise<{ liked: boolean; likes: number } | undefined> {
  const [clip] = await db.select({ id: clips.id }).from(clips).where(eq(clips.id, clipId));
  if (!clip) return undefined;
  if (liked) {
    await db.insert(clipLikes).values({ clipId, userId }).onConflictDoNothing();
  } else {
    await db.delete(clipLikes).where(and(eq(clipLikes.clipId, clipId), eq(clipLikes.userId, userId)));
  }
  const updated = await getClip(db, clipId);
  return { liked, likes: updated?.likes ?? 0 };
}

const hourOf = (ms: number) => Math.floor(ms / (60 * 60 * 1000));

/**
 * 再生を 1 回記録する。viewerKey はログインの有無に関係なく Cookie で振る匿名 ID。
 * 数えたら true、重複として無視したら false、クリップが無ければ undefined を返す。
 * 重複判定は 1 つの INSERT ... ON CONFLICT で行うので、同時に来ても二重に数えない。
 */
export async function recordView(db: Db, clipId: string, viewerKey: string): Promise<boolean | undefined> {
  const [clip] = await db.select({ id: clips.id }).from(clips).where(eq(clips.id, clipId));
  if (!clip) return undefined;
  const now = new Date();
  const threshold = new Date(now.getTime() - VIEW_DEDUPE_MS);

  const counted = await db.transaction(async (tx) => {
    const rows = await tx
      .insert(clipViewDedupe)
      .values({ viewerKey, clipId, lastAt: now })
      .onConflictDoUpdate({
        target: [clipViewDedupe.viewerKey, clipViewDedupe.clipId],
        set: { lastAt: now },
        // 前回から間隔が空いているときだけ更新する（更新できた = 数える）
        setWhere: lte(clipViewDedupe.lastAt, threshold),
      })
      .returning({ clipId: clipViewDedupe.clipId });
    if (rows.length === 0) return false;
    await tx
      .insert(clipViewsHourly)
      .values({ clipId, hour: hourOf(now.getTime()), seeded: false, count: 1 })
      .onConflictDoUpdate({
        target: [clipViewsHourly.clipId, clipViewsHourly.hour, clipViewsHourly.seeded],
        set: { count: sql`${clipViewsHourly.count} + 1` },
      });
    return true;
  });

  // 判定用の記録が溜まり続けないよう、ときどき古いものを捨てる
  if (Math.random() < 0.01) {
    await db
      .delete(clipViewDedupe)
      .where(lt(clipViewDedupe.lastAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)))
      .catch(() => {});
  }
  return counted;
}

/** コメントを投稿する。クリップが無ければ undefined */
export async function addClipComment(
  db: Db,
  clipId: string,
  author: User,
  body: string,
): Promise<Comment | undefined> {
  const [clip] = await db.select({ id: clips.id }).from(clips).where(eq(clips.id, clipId));
  if (!clip) return undefined;
  const comment = { id: crypto.randomUUID(), body, createdAt: new Date() };
  await db.insert(clipComments).values({ ...comment, clipId, authorId: author.id });
  return { ...comment, author, createdAt: comment.createdAt.toISOString() };
}

/** コメントを書いた本人か、クリップの投稿者なら削除できる */
export async function deleteClipComment(
  db: Db,
  clipId: string,
  commentId: string,
  userId: string,
): Promise<"deleted" | "not_found" | "forbidden"> {
  const [row] = await db
    .select({ authorId: clipComments.authorId, uploaderId: clips.uploaderId })
    .from(clipComments)
    .innerJoin(clips, eq(clipComments.clipId, clips.id))
    .where(and(eq(clipComments.id, commentId), eq(clipComments.clipId, clipId)));
  if (!row) return "not_found";
  if (row.authorId !== userId && row.uploaderId !== userId) return "forbidden";
  await db.delete(clipComments).where(eq(clipComments.id, commentId));
  return "deleted";
}
