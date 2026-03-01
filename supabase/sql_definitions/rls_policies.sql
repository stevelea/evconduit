-- Row Level Security policies for all public tables
-- Applied 2026-03-01 to close email exposure via anon Supabase key
--
-- IMPORTANT: Every public table MUST have RLS enabled. Without it, the
-- anon key (embedded in the frontend JS) grants unrestricted SELECT on
-- the table via the Supabase REST API.

-- ============================================================
-- api_keys — users manage their own keys
-- ============================================================
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys"
  ON public.api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- api_telemetry — backend only
-- ============================================================
ALTER TABLE public.api_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.api_telemetry FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- charging_samples — backend writes, users read own
-- ============================================================
ALTER TABLE public.charging_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.charging_samples FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own samples"
  ON public.charging_samples FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- charging_sessions — backend writes, users read own
-- ============================================================
ALTER TABLE public.charging_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.charging_sessions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own sessions"
  ON public.charging_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- email_templates — authenticated read, no anon access
-- ============================================================
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read email templates"
  ON public.email_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Disallow all for anonymous users"
  ON public.email_templates FOR ALL
  USING (false);

-- ============================================================
-- enode_accounts — backend only
-- ============================================================
ALTER TABLE public.enode_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on enode_accounts"
  ON public.enode_accounts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- interest — backend only (contains emails!)
-- ============================================================
ALTER TABLE public.interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.interest FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- invoices — backend only
-- ============================================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.invoices FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- newsletter — backend only (contains emails!)
-- ============================================================
ALTER TABLE public.newsletter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.newsletter FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- onboarding_progress — users manage own
-- ============================================================
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own onboarding status"
  ON public.onboarding_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding status"
  ON public.onboarding_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- poll_logs — backend only
-- ============================================================
ALTER TABLE public.poll_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.poll_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- sent_emails — users read own, authenticated insert
-- ============================================================
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read their own sent emails"
  ON public.sent_emails FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to insert sent emails"
  ON public.sent_emails FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Disallow all for anonymous users on sent_emails"
  ON public.sent_emails FOR ALL
  USING (false);

-- ============================================================
-- settings — backend only
-- ============================================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.settings FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- status_logs — service role full access
-- ============================================================
ALTER TABLE public.status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON public.status_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- subscription_plans — public read, service role write
-- ============================================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read"
  ON public.subscription_plans FOR SELECT
  USING (true);

CREATE POLICY "Service role write"
  ON public.subscription_plans FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- subscriptions — users read own
-- ============================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- useful_links — public read, service role write
-- ============================================================
ALTER TABLE public.useful_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read"
  ON public.useful_links FOR SELECT
  USING (true);

CREATE POLICY "Service role write"
  ON public.useful_links FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- user_updates — authenticated read active, service role write
-- ============================================================
ALTER TABLE public.user_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read active updates"
  ON public.user_updates FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Service role full access"
  ON public.user_updates FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- users — users read/update own (contains emails!)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own data"
  ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- vehicles — users manage own
-- ============================================================
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own vehicles"
  ON public.vehicles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vehicles"
  ON public.vehicles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vehicles"
  ON public.vehicles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vehicles"
  ON public.vehicles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- webhook_logs — backend only
-- ============================================================
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.webhook_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- webhook_subscriptions — service role + admin
-- ============================================================
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow access for service role"
  ON public.webhook_subscriptions FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow admin users full access"
  ON public.webhook_subscriptions FOR ALL
  USING (((auth.jwt() -> 'user_metadata') ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() -> 'user_metadata') ->> 'role') = 'admin');

-- ============================================================
-- xcombo_scenes — public read, service role write
-- ============================================================
ALTER TABLE public.xcombo_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read"
  ON public.xcombo_scenes FOR SELECT
  USING (true);

CREATE POLICY "Service role write"
  ON public.xcombo_scenes FOR ALL
  USING (auth.role() = 'service_role');
