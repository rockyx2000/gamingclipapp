// 開発用のシードを入れる。何度実行しても重複しない（既にある行は触らない）。

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import {
  SEED_VIDEO_SECONDS,
  generateSeedViewHistory,
  games,
  seedClipComments,
  seedClips,
  seedRecruits,
  seedVideoKey,
  users,
  type SeedVideoName,
} from "@gamingclipapp/shared/seed";
import { eq, sql as dsql } from "drizzle-orm";
import { config } from "../config";
import { getStorage } from "../storage";
import { createDb } from "./client";
import * as schema from "./schema";

const { db, sql } = createDb(config.databaseUrl);

// シードのクリップの動画（apps/api/seed-media/）を、保存先の "seed/<名前>.mp4" に置く。
// すでに同じ大きさのものがあれば置き直さない。
const SEED_MEDIA_DIR = path.resolve(process.cwd(), "seed-media");
const storage = getStorage();
const seedVideoSizes = new Map<string, number>();
for (const name of Object.keys(SEED_VIDEO_SECONDS) as SeedVideoName[]) {
  const file = path.join(SEED_MEDIA_DIR, `${name}.mp4`);
  const { size } = await stat(file);
  seedVideoSizes.set(name, size);
  const key = seedVideoKey(name);
  if ((await storage.head(key))?.size !== size) {
    await storage.put(key, Readable.toWeb(createReadStream(file)) as NodeReadableStream as ReadableStream<Uint8Array>);
  }
}
const seedVideoName = (url: string) => url.split("/").pop()!.replace(/\.mp4$/, "");

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
      mimeType: "video/mp4",
      sizeBytes: seedVideoSizes.get(seedVideoName(c.videoUrl)) ?? null,
      gameId: c.gameId,
      uploaderId: c.uploader.id,
      views: c.views,
      likes: c.likes,
      createdAt: new Date(c.createdAt),
    })),
  )
  // 動画の差し替え（外部のサンプル動画 → 同梱の動画）が、すでにあるシードにも届くようにする。
  // タイトルなど、ユーザーが編集しうるものは触らない
  .onConflictDoUpdate({
    target: schema.clips.id,
    set: {
      videoUrl: dsql`excluded.video_url`,
      durationSec: dsql`excluded.duration_sec`,
      mimeType: dsql`excluded.mime_type`,
      sizeBytes: dsql`excluded.size_bytes`,
    },
  });

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
