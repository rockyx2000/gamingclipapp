// 開発用のシードを入れる。何度実行しても重複しない（既にある行は触らない）。

import {
  generateSeedViewHistory,
  games,
  seedClipComments,
  seedClips,
  seedRecruits,
  users,
} from "@gamingclipapp/shared/seed";
import { eq } from "drizzle-orm";
import { config } from "../config";
import { createDb } from "./client";
import * as schema from "./schema";

const { db, sql } = createDb(config.databaseUrl);

await db.insert(schema.users).values(users).onConflictDoNothing();
await db
  .insert(schema.games)
  .values(games.map(({ clipCount: _clipCount, ...g }, i) => ({ ...g, sortOrder: i })))
  .onConflictDoNothing();
await db
  .insert(schema.clips)
  .values(
    seedClips.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      videoUrl: c.videoUrl,
      thumbnailUrl: c.thumbnailUrl,
      durationSec: c.durationSec,
      mimeType: c.mimeType ?? null,
      sizeBytes: c.sizeBytes ?? null,
      gameId: c.gameId,
      uploaderId: c.uploader.id,
      views: c.views,
      likes: c.likes,
      createdAt: new Date(c.createdAt),
    })),
  )
  .onConflictDoNothing();

await db
  .insert(schema.clipComments)
  .values(
    Object.entries(seedClipComments).flatMap(([clipId, list]) =>
      list.map((c) => ({
        id: c.id,
        clipId,
        authorId: c.authorId,
        body: c.body,
        createdAt: new Date(c.createdAt),
      })),
    ),
  )
  .onConflictDoNothing();

await db
  .insert(schema.recruitPosts)
  .values(
    seedRecruits.map((r) => ({
      id: r.id,
      gameId: r.gameId,
      title: r.title,
      body: r.body,
      authorId: r.author.id,
      positions: r.positions,
      rank: r.rank ?? null,
      status: r.status,
      createdAt: new Date(r.createdAt),
    })),
  )
  .onConflictDoNothing();
await db
  .insert(schema.recruitComments)
  .values(
    seedRecruits.flatMap((r) =>
      r.comments.map((c) => ({
        id: c.id,
        postId: r.id,
        authorId: c.author.id,
        body: c.body,
        createdAt: new Date(c.createdAt),
      })),
    ),
  )
  .onConflictDoNothing();

// 見せかけの再生履歴は「いま」を基準に作るので、実行のたびに作り直す（日が経つと
// ランキングや急上昇が空になるため）。seeded = false の本物の記録には触らない。
const history = [...generateSeedViewHistory(seedClips)].flatMap(([clipId, buckets]) =>
  [...buckets].map(([hour, count]) => ({ clipId, hour, seeded: true, count })),
);
await db.transaction(async (tx) => {
  await tx.delete(schema.clipViewsHourly).where(eq(schema.clipViewsHourly.seeded, true));
  // 1 回の INSERT に載せられるパラメータ数の上限を超えないよう分ける
  for (let i = 0; i < history.length; i += 5000) {
    await tx.insert(schema.clipViewsHourly).values(history.slice(i, i + 5000));
  }
});

console.log(`seeded: ${users.length} users, ${games.length} games, ${seedClips.length} clips, ${seedRecruits.length} recruits, ${history.length} view buckets`);
await sql.end();
