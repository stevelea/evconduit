-- ABRP Pull settings: credentials and stats on the users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS abrp_pull_session_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS abrp_pull_api_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS abrp_pull_vehicle_ids TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS abrp_pull_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS abrp_pull_last_pull_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS abrp_pull_success_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS abrp_pull_fail_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS abrp_pull_last_error TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS abrp_pull_consecutive_fails INTEGER DEFAULT 0;
