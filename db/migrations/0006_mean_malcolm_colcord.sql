ALTER TABLE "file" ADD COLUMN "meeting_id" text;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_meeting_id_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder" ADD CONSTRAINT "folder_meeting_id_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meeting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_meeting_idx" ON "file" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "folder_meeting_idx" ON "folder" USING btree ("meeting_id");--> statement-breakpoint
ALTER TABLE "folder" DROP COLUMN "is_system";--> statement-breakpoint
ALTER TABLE "meeting" DROP COLUMN "folder_id";