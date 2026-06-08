CREATE TABLE "language" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"rtl" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation" (
	"id" text PRIMARY KEY NOT NULL,
	"language_code" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "translation" ADD CONSTRAINT "translation_language_code_language_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."language"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "translation_lang_idx" ON "translation" USING btree ("language_code");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_lang_key_uq" ON "translation" USING btree ("language_code","key");--> statement-breakpoint
INSERT INTO "language" ("code", "label", "is_default", "enabled", "rtl", "updated_at")
VALUES ('eng', 'English', true, true, false, now())
ON CONFLICT ("code") DO UPDATE SET
  "label" = EXCLUDED."label",
  "is_default" = EXCLUDED."is_default",
  "enabled" = EXCLUDED."enabled",
  "rtl" = EXCLUDED."rtl",
  "updated_at" = now();
--> statement-breakpoint
INSERT INTO "translation" ("id", "language_code", "key", "value", "updated_at")
VALUES
  ('eng-translations-edit-translations', 'eng', 'translations.editTranslations', 'Edit', now()),
  ('eng-translations-col-status', 'eng', 'translations.colStatus', 'Enabled', now()),
  ('eng-manage-table-status', 'eng', 'manage.tableStatus', 'Active', now()),
  ('eng-file-list-col-actions', 'eng', 'fileList.colActions', 'Actions', now())
ON CONFLICT ("language_code", "key") DO UPDATE SET
  "value" = EXCLUDED."value",
  "updated_at" = now();
--> statement-breakpoint
DELETE FROM "translation"
WHERE "language_code" = 'eng'
  AND "key" = 'translations.defaultSourceBadge';