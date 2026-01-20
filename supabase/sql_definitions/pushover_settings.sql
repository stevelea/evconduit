-- Add Pushover notification settings to users table
-- Run this migration to enable Pushover push notifications

-- User's Pushover user key (30 character string from their Pushover account)
ALTER TABLE users ADD COLUMN IF NOT EXISTS pushover_user_key TEXT;

-- Whether Pushover notifications are enabled for this user
ALTER TABLE users ADD COLUMN IF NOT EXISTS pushover_enabled BOOLEAN DEFAULT FALSE;

-- Notification preferences (which events trigger notifications)
-- Stored as JSONB for flexibility: {"charge_complete": true, "charge_started": true, "vehicle_offline": false}
ALTER TABLE users ADD COLUMN IF NOT EXISTS pushover_events JSONB DEFAULT '{"charge_complete": true, "charge_started": false, "vehicle_offline": false, "vehicle_online": false}'::jsonb;

-- Last Pushover notification sent timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS pushover_last_sent_at TIMESTAMPTZ;

-- Add index for querying users with Pushover enabled
CREATE INDEX IF NOT EXISTS idx_users_pushover_enabled ON users(pushover_enabled) WHERE pushover_enabled = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN users.pushover_user_key IS 'User''s Pushover user key for push notifications';
COMMENT ON COLUMN users.pushover_enabled IS 'Whether Pushover notifications are enabled';
COMMENT ON COLUMN users.pushover_events IS 'JSON object specifying which events trigger notifications';
