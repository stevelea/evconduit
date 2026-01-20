-- Add ha_last_error column to store HA webhook error messages
-- This allows us to show users when their HA config needs updating

ALTER TABLE users ADD COLUMN IF NOT EXISTS ha_last_error TEXT;

-- Add comment
COMMENT ON COLUMN users.ha_last_error IS 'Last error from HA webhook push (e.g., vehicle_id_mismatch)';
