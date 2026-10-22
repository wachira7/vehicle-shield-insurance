CREATE TYPE "public"."photo_purpose" AS ENUM('vehicle', 'claim');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "claim_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner" text NOT NULL,
	"policy_id" bigint NOT NULL,
	"manifest_cid" text NOT NULL,
	"uri" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"purpose" "photo_purpose" NOT NULL,
	"vehicle_submission_id" uuid,
	"evidence_id" uuid,
	"view" text,
	"storage_key" text NOT NULL,
	"cid" text NOT NULL,
	"sha256" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner" text NOT NULL,
	"plate" text NOT NULL,
	"vehicle_id" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"market_value" bigint NOT NULL,
	"mileage_km" integer NOT NULL,
	"condition" integer NOT NULL,
	"accidents_last_3_years" integer NOT NULL,
	"usage" text NOT NULL,
	"status" "vehicle_status" DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "photo" ADD CONSTRAINT "photo_vehicle_submission_id_vehicle_id_fk" FOREIGN KEY ("vehicle_submission_id") REFERENCES "public"."vehicle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo" ADD CONSTRAINT "photo_evidence_id_claim_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."claim_evidence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photo_vehicle_idx" ON "photo" USING btree ("vehicle_submission_id");--> statement-breakpoint
CREATE INDEX "photo_evidence_idx" ON "photo" USING btree ("evidence_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_owner_vehicle_id" ON "vehicle" USING btree ("owner","vehicle_id");--> statement-breakpoint
CREATE INDEX "vehicle_status_idx" ON "vehicle" USING btree ("status");