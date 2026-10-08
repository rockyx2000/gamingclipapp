CREATE TABLE "clip_view_dedupe" (
	"viewer_key" text NOT NULL,
	"clip_id" text NOT NULL,
	"last_at" timestamp with time zone NOT NULL,
	CONSTRAINT "clip_view_dedupe_viewer_key_clip_id_pk" PRIMARY KEY("viewer_key","clip_id")
);
--> statement-breakpoint
ALTER TABLE "clip_view_dedupe" ADD CONSTRAINT "clip_view_dedupe_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clip_view_dedupe_last_idx" ON "clip_view_dedupe" USING btree ("last_at");