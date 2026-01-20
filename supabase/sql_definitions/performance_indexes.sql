-- Performance indexes for frequently queried tables
-- Created: 2026-01-18

-- Index for poll_logs: speeds up queries filtering by user_id and created_at
-- Used by get_all_users_with_enode_info() for API usage stats
CREATE INDEX IF NOT EXISTS idx_poll_logs_user_id_created_at
ON public.poll_logs (user_id, created_at DESC);

-- Index for poll_logs: speeds up time-based queries (new users in last N days)
CREATE INDEX IF NOT EXISTS idx_poll_logs_created_at
ON public.poll_logs (created_at DESC);

-- Index for vehicles: speeds up queries filtering by user_id
-- Used by multiple endpoints fetching user's vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id
ON public.vehicles (user_id);

-- Index for users: speeds up queries filtering by created_at (new user counts)
CREATE INDEX IF NOT EXISTS idx_users_created_at
ON public.users (created_at DESC);

-- Index for vehicles: speeds up queries filtering by created_at (new vehicle counts)
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at
ON public.vehicles (created_at DESC);
