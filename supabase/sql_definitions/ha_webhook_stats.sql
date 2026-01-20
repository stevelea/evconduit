-- Add HA webhook health monitoring columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS ha_push_success_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ha_push_fail_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ha_last_push_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ha_last_check_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ha_url_reachable BOOLEAN;
