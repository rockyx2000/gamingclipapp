// PostgreSQL のスキーマ。型は packages/shared の型（API レスポンスの形）に対応する。
// 読み取り API が使うテーブルを持つ。書き込み（ログイン・いいね・再生の記録・投稿など）は
// まだ移していないので、これらのテーブルに書くのはシードだけ。

import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
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

/** ログインセッション。Cookie の ID からユーザーを引く（作るのはログインを移すときに実装する） */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clipLikes = pgTable(
  "clip_likes",
  {
    clipId: text("clip_id")
      .notNull()
      .references(() => clips.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    likedAt: timestamp("liked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.clipId, t.userId] }), index("clip_likes_user_idx").on(t.userId)],
);

export const clipComments = pgTable(
  "clip_comments",
  {
    id: text("id").primaryKey(),
    clipId: text("clip_id")
      .notNull()
      .references(() => clips.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("clip_comments_clip_idx").on(t.clipId)],
);

/**
 * 時間別の再生数。hour はエポックからの時間（ランキングと急上昇の集計用）。
 * seeded = true は開発用シードが作る見せかけの履歴で、クリップの総再生数には足さない。
 */
export const clipViewsHourly = pgTable(
  "clip_views_hourly",
  {
    clipId: text("clip_id")
      .notNull()
      .references(() => clips.id, { onDelete: "cascade" }),
    hour: integer("hour").notNull(),
    seeded: boolean("seeded").notNull().default(false),
    count: integer("count").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.clipId, t.hour, t.seeded] }),
    index("clip_views_hourly_hour_idx").on(t.hour),
  ],
);

export const playlists = pgTable(
  "playlists",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    /** "public" | "private" */
    visibility: text("visibility").notNull().default("public"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("playlists_owner_idx").on(t.ownerId)],
);

export const playlistClips = pgTable(
  "playlist_clips",
  {
    playlistId: text("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    clipId: text("clip_id")
      .notNull()
      .references(() => clips.id, { onDelete: "cascade" }),
    /** 再生順（0 始まり） */
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.playlistId, t.clipId] })],
);

export const recruitPosts = pgTable(
  "recruit_posts",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    title: text("title").notNull(),
    body: text("body").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    positions: text("positions").array().notNull().default([]),
    rank: text("rank"),
    /** "open" | "closed" */
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("recruit_posts_game_idx").on(t.gameId)],
);

export const recruitComments = pgTable(
  "recruit_comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => recruitPosts.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("recruit_comments_post_idx").on(t.postId)],
);

/**
 * 再生の重複判定。同じ視聴者（匿名 ID の Cookie）が同じクリップを短時間に見直した分を数えないための、
 * 最後に数えた時刻。DB に持つので、api を複数動かしても判定が揃う。
 */
export const clipViewDedupe = pgTable(
  "clip_view_dedupe",
  {
    viewerKey: text("viewer_key").notNull(),
    clipId: text("clip_id")
      .notNull()
      .references(() => clips.id, { onDelete: "cascade" }),
    lastAt: timestamp("last_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.viewerKey, t.clipId] }), index("clip_view_dedupe_last_idx").on(t.lastAt)],
);
