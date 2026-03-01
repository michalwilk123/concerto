DROP TABLE IF EXISTS "file" CASCADE;--> statement-breakpoint
ALTER TABLE "folder" ADD COLUMN "meeting_id" text;--> statement-breakpoint
ALTER TABLE "meeting" ADD COLUMN "folder_id" text;