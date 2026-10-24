ALTER TABLE "photo" ADD COLUMN "phash" text;--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "captured_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "gps_lat" double precision;--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "gps_lon" double precision;--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "camera" text;--> statement-breakpoint
ALTER TABLE "photo" ADD COLUMN "metadata_source" text;--> statement-breakpoint
CREATE INDEX "photo_sha256_idx" ON "photo" USING btree ("sha256");