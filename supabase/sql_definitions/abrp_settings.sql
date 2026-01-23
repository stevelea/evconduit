-- Add ABRP (A Better Route Planner) telemetry settings to users table
-- This allows users to automatically send vehicle data to ABRP for route planning

-- User's ABRP vehicle token (obtained from ABRP app settings)
ALTER TABLE users ADD COLUMN IF NOT EXISTS abrp_token TEXT;

-- Whether ABRP telemetry updates are enabled
ALTER TABLE users ADD COLUMN IF NOT EXISTS abrp_enabled BOOLEAN DEFAULT FALSE;

-- Last successful ABRP push timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS abrp_last_push_at TIMESTAMPTZ;

-- Count of successful ABRP pushes
ALTER TABLE users ADD COLUMN IF NOT EXISTS abrp_push_success_count INTEGER DEFAULT 0;

-- Count of failed ABRP pushes
ALTER TABLE users ADD COLUMN IF NOT EXISTS abrp_push_fail_count INTEGER DEFAULT 0;

-- Last error message (if any)
ALTER TABLE users ADD COLUMN IF NOT EXISTS abrp_last_error TEXT;

-- Add comments for documentation
COMMENT ON COLUMN users.abrp_token IS 'User''s ABRP vehicle token for telemetry updates';
COMMENT ON COLUMN users.abrp_enabled IS 'Whether ABRP telemetry updates are enabled';
COMMENT ON COLUMN users.abrp_last_push_at IS 'Timestamp of last successful ABRP telemetry push';
COMMENT ON COLUMN users.abrp_push_success_count IS 'Count of successful ABRP telemetry pushes';
COMMENT ON COLUMN users.abrp_push_fail_count IS 'Count of failed ABRP telemetry pushes';
COMMENT ON COLUMN users.abrp_last_error IS 'Last error message from ABRP API';
