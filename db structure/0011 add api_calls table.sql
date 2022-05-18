CREATE TABLE "public"."api_calls" ("id" uuid NOT NULL,"name" text NOT NULL DEFAULT '', PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "api_calls_uniquename" ON "public"."api_calls" USING BTREE ("name");