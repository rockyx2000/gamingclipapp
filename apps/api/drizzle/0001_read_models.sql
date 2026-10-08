CREATE TABLE "clip_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"clip_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clip_likes" (
	"clip_id" text NOT NULL,
	"user_id" text NOT NULL,
	"liked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clip_likes_clip_id_user_id_pk" PRIMARY KEY("clip_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "clip_views_hourly" (
	"clip_id" text NOT NULL,
	"hour" integer NOT NULL,
	"seeded" boolean DEFAULT false NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "clip_views_hourly_clip_id_hour_seeded_pk" PRIMARY KEY("clip_id","hour","seeded")
);
--> statement-breakpoint
CREATE TABLE "playlist_clips" (
	"playlist_id" text NOT NULL,
	"clip_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "playlist_clips_playlist_id_clip_id_pk" PRIMARY KEY("playlist_id","clip_id")
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recruit_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recruit_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"author_id" text NOT NULL,
	"positions" text[] DEFAULT '{}' NOT NULL,
	"rank" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clip_comments" ADD CONSTRAINT "clip_comments_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_comments" ADD CONSTRAINT "clip_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_likes" ADD CONSTRAINT "clip_likes_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_likes" ADD CONSTRAINT "clip_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_views_hourly" ADD CONSTRAINT "clip_views_hourly_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_clips" ADD CONSTRAINT "playlist_clips_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_clips" ADD CONSTRAINT "playlist_clips_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruit_comments" ADD CONSTRAINT "recruit_comments_post_id_recruit_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."recruit_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruit_comments" ADD CONSTRAINT "recruit_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruit_posts" ADD CONSTRAINT "recruit_posts_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruit_posts" ADD CONSTRAINT "recruit_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clip_comments_clip_idx" ON "clip_comments" USING btree ("clip_id");--> statement-breakpoint
CREATE INDEX "clip_likes_user_idx" ON "clip_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clip_views_hourly_hour_idx" ON "clip_views_hourly" USING btree ("hour");--> statement-breakpoint
CREATE INDEX "playlists_owner_idx" ON "playlists" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "recruit_comments_post_idx" ON "recruit_comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "recruit_posts_game_idx" ON "recruit_posts" USING btree ("game_id");