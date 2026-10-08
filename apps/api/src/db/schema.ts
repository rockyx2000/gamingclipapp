// PostgreSQL のスキーマ。型は packages/shared の型（API レスポンスの形）に対応する。
// このマイルストーンでは読み取りに必要な users / games / clips だけを持つ。
// いいね・コメント・プレイリスト・募集は、API を移すときにテーブルを足す。

import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url").notNull(),
});

export const games = pgTable("games", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  genre: text("genre").notNull(),
  coverUrl: text("cover_url").notNull(),
  description: text("description").notNull(),
  /** 一覧の並び順（シードの並び） */
  sortOrder: integer("sort_order").notNull().default(0),
});

export const clips = pgTable(
  "clips",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    videoUrl: text("video_url").notNull(),
    thumbnailUrl: text("thumbnail_url").notNull(),
    durationSec: integer("duration_sec").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    uploaderId: text("uploader_id")
      .notNull()
      .references(() => users.id),
    /** シードの初期値。再生の記録を移したら、集計は別テーブルから足す */
    views: integer("views").notNull().default(0),
    /** シードの初期値。いいねを移したら、集計は別テーブルから足す */
    likes: integer("likes").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("clips_game_id_idx").on(t.gameId), index("clips_created_at_idx").on(t.createdAt)],
);
