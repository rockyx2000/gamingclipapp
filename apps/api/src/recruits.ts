// メンバー募集の読み取り

import { asc, desc, eq, inArray } from "drizzle-orm";
import type { Comment, RecruitStatus, RecruitWithGame } from "@gamingclipapp/shared";
import type { Db } from "./db/client";
import { recruitComments, recruitPosts, users } from "./db/schema";
import { getGame, listGames } from "./queries";

const authorColumns = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
};

async function selectPosts(db: Db, where: ReturnType<typeof eq> | undefined): Promise<RecruitWithGame[]> {
  const rows = await db
    .select({
      id: recruitPosts.id,
      gameId: recruitPosts.gameId,
      title: recruitPosts.title,
      body: recruitPosts.body,
      positions: recruitPosts.positions,
      rank: recruitPosts.rank,
      status: recruitPosts.status,
      createdAt: recruitPosts.createdAt,
      author: authorColumns,
    })
    .from(recruitPosts)
    .innerJoin(users, eq(recruitPosts.authorId, users.id))
    .where(where)
    .orderBy(desc(recruitPosts.createdAt), desc(recruitPosts.id));
  if (rows.length === 0) return [];

  const commentRows = await db
    .select({
      postId: recruitComments.postId,
      id: recruitComments.id,
      body: recruitComments.body,
      createdAt: recruitComments.createdAt,
      author: authorColumns,
    })
    .from(recruitComments)
    .innerJoin(users, eq(recruitComments.authorId, users.id))
    .where(
      inArray(
        recruitComments.postId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(recruitComments.createdAt), asc(recruitComments.id));

  const gameById = new Map((await listGames(db)).map((g) => [g.id, g]));
  const result: RecruitWithGame[] = [];
  for (const row of rows) {
    const game = gameById.get(row.gameId);
    if (!game) continue;
    const comments: Comment[] = commentRows
      .filter((c) => c.postId === row.id)
      .map((c) => ({
        id: c.id,
        author: c.author,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
      }));
    result.push({
      id: row.id,
      gameId: row.gameId,
      title: row.title,
      body: row.body,
      author: row.author,
      positions: row.positions,
      // 条件が無いときは、キーごと省く（web のモックと同じ）
      ...(row.rank !== null && { rank: row.rank }),
      status: row.status as RecruitStatus,
      createdAt: row.createdAt.toISOString(),
      comments,
      game,
    });
  }
  return result;
}

export async function listRecruits(db: Db, gameSlug?: string): Promise<RecruitWithGame[]> {
  if (!gameSlug) return selectPosts(db, undefined);
  const game = await getGame(db, gameSlug);
  return game ? selectPosts(db, eq(recruitPosts.gameId, game.id)) : [];
}

export async function getRecruit(db: Db, id: string): Promise<RecruitWithGame | undefined> {
  const [post] = await selectPosts(db, eq(recruitPosts.id, id));
  return post;
}
