-- Vendor Unlinks tracking table
-- Records when users unlink a vehicle vendor

CREATE TABLE IF NOT EXISTS "public"."vendor_unlinks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_email" "text",
    "vendor" "text" NOT NULL,
    "deleted_vehicle_count" integer NOT NULL DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vendor_unlinks_pkey'
    ) THEN
        ALTER TABLE ONLY "public"."vendor_unlinks"
            ADD CONSTRAINT "vendor_unlinks_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

ALTER TABLE "public"."vendor_unlinks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
    ON "public"."vendor_unlinks" FOR ALL
    TO "service_role"
    USING (true)
    WITH CHECK (true);

GRANT ALL ON TABLE "public"."vendor_unlinks" TO "service_role";

CREATE INDEX IF NOT EXISTS "idx_vendor_unlinks_created_at"
    ON "public"."vendor_unlinks" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_vendor_unlinks_user_id"
    ON "public"."vendor_unlinks" ("user_id");
