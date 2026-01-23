-- Add user-editable fields to charging_sessions table
-- These columns allow users to track costs and odometer readings for their charging sessions

ALTER TABLE public.charging_sessions
ADD COLUMN IF NOT EXISTS cost_per_kwh NUMERIC NULL,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC NULL,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'SEK',
ADD COLUMN IF NOT EXISTS user_odometer_km NUMERIC NULL;

-- Add index for efficient querying of user sessions by start time
CREATE INDEX IF NOT EXISTS idx_charging_sessions_user_start
ON public.charging_sessions(user_id, start_time DESC);

-- Add comments for documentation
COMMENT ON COLUMN public.charging_sessions.cost_per_kwh IS 'User-entered cost per kWh for this session';
COMMENT ON COLUMN public.charging_sessions.total_cost IS 'User-entered total cost for this session (auto-calculated if cost_per_kwh provided)';
COMMENT ON COLUMN public.charging_sessions.currency IS 'Currency code for cost fields (default SEK)';
COMMENT ON COLUMN public.charging_sessions.user_odometer_km IS 'User-entered odometer reading at time of charging session';
