CREATE TABLE "public"."content" ("id" uuid NOT NULL,"text" text NOT NULL DEFAULT '', PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "content_uniquetext" ON "public"."content" USING BTREE ("text");