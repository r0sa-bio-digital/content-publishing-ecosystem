ALTER TABLE "public"."content"
ADD COLUMN "hashsum" varchar(257) NOT NULL DEFAULT '';

DROP INDEX "public"."content_uniquetext";
CREATE UNIQUE INDEX "content_uniquetext" ON "public"."content" USING BTREE ("hashsum");