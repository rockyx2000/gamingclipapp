// 開発用のシードを入れる。何度実行しても重複しない（既にある行は触らない）。

import { games, seedClips, users } from "@gamingclipapp/shared/seed";
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

console.log(`seeded: ${users.length} users, ${games.length} games, ${seedClips.length} clips`);
await sql.end();
