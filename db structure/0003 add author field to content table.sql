ALTER TABLE "public"."content" ADD COLUMN "author" uuid NOT NULL;
ALTER TABLE "public"."content" ADD FOREIGN KEY ("author") REFERENCES "public"."users" ("id") ON UPDATE RESTRICT ON DELETE RESTRICT;