CREATE TABLE "clip_tags" (
	"clip_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clip_tags_clip_id_user_id_pk" PRIMARY KEY("clip_id","user_id")
);
--> statement-breakpoint
DROP INDEX "clip_comments_clip_idx";--> statement-breakpoint
DROP INDEX "recruit_comments_post_idx";--> statement-breakpoint
ALTER TABLE "clip_comments" ADD COLUMN "mentions" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "recruit_comments" ADD COLUMN "mentions" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "clip_tags" ADD CONSTRAINT "clip_tags_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_tags" ADD CONSTRAINT "clip_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clip_tags_user_idx" ON "clip_tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clip_comments_clip_idx" ON "clip_comments" USING btree ("clip_id","created_at");--> statement-breakpoint
CREATE INDEX "recruit_comments_post_idx" ON "recruit_comments" USING btree ("post_id","created_at");