-- ============================================
-- Webhook Tables for EVConduit
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- 1. WEBHOOK_LOGS TABLE
-- Stores all incoming webhook events from Enode
-- ============================================
CREATE TABLE IF NOT EXISTS "public"."webhook_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "vehicle_id" "uuid",
    "event_type" "text" NOT NULL,
    "event" "text",
    "version" "text",
    "payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

-- Primary key (use DO block to handle if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'webhook_logs_pkey'
    ) THEN
        ALTER TABLE ONLY "public"."webhook_logs"
            ADD CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON TABLE "public"."webhook_logs" TO "anon";
GRANT ALL ON TABLE "public"."webhook_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_logs" TO "service_role";


-- ============================================
-- 2. WEBHOOK_SUBSCRIPTIONS TABLE
-- Tracks Enode webhook subscriptions and their health
-- ============================================
CREATE TABLE IF NOT EXISTS "public"."webhook_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enode_webhook_id" "text" NOT NULL,
    "url" "text" NOT NULL,
    "events" "text"[] NOT NULL,
    "secret" "text",
    "api_version" "text",
    "is_active" boolean DEFAULT true,
    "last_success" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone,
    "authentication" "jsonb"
);

-- Primary key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'webhook_subscriptions_pkey'
    ) THEN
        ALTER TABLE ONLY "public"."webhook_subscriptions"
            ADD CONSTRAINT "webhook_subscriptions_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

-- Unique constraint on enode_webhook_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'webhook_subscriptions_enode_webhook_id_key'
    ) THEN
        ALTER TABLE ONLY "public"."webhook_subscriptions"
            ADD CONSTRAINT "webhook_subscriptions_enode_webhook_id_key" UNIQUE ("enode_webhook_id");
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE "public"."webhook_subscriptions" ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exist first to avoid errors)
DROP POLICY IF EXISTS "Allow access for service role" ON "public"."webhook_subscriptions";
CREATE POLICY "Allow access for service role"
    ON "public"."webhook_subscriptions"
    TO "service_role"
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin users full access" ON "public"."webhook_subscriptions";
CREATE POLICY "Allow admin users full access"
    ON "public"."webhook_subscriptions"
    FOR ALL
    USING (((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"))
    WITH CHECK (((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));

-- Grant permissions
GRANT ALL ON TABLE "public"."webhook_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."webhook_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_subscriptions" TO "service_role";


-- ============================================
-- 3. WEBHOOK_LOGS_VIEW
-- Admin dashboard view with text-searchable columns
-- ============================================
CREATE OR REPLACE VIEW public.webhook_logs_view AS
SELECT
    id,
    created_at,
    payload,
    user_id,
    vehicle_id,
    event,
    event_type,
    version,
    user_id::text AS user_id_text,
    vehicle_id::text AS vehicle_id_text
FROM public.webhook_logs
ORDER BY created_at DESC;

-- Grant access to the view
GRANT SELECT ON public.webhook_logs_view TO authenticated;
GRANT SELECT ON public.webhook_logs_view TO service_role;


-- ============================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS "idx_webhook_logs_created_at"
    ON "public"."webhook_logs" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_webhook_logs_user_id"
    ON "public"."webhook_logs" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_webhook_logs_event"
    ON "public"."webhook_logs" ("event");

CREATE INDEX IF NOT EXISTS "idx_webhook_subscriptions_is_active"
    ON "public"."webhook_subscriptions" ("is_active");


-- ============================================
-- Done!
-- ============================================
SELECT 'Webhook tables created successfully!' as status;
