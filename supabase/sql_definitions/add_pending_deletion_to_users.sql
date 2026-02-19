-- supabase/sql_definitions/add_pending_deletion_to_users.sql
-- Add columns to track users pending deletion for inactive account cleanup

-- Add pending_deletion flag (default false)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pending_deletion boolean DEFAULT false;

-- Add timestamp for when the user was flagged for deletion
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pending_deletion_at timestamptz;

-- Add comments
COMMENT ON COLUMN public.users.pending_deletion IS 'Flag indicating user is pending admin review for deletion due to inactivity';
COMMENT ON COLUMN public.users.pending_deletion_at IS 'Timestamp when the user was flagged for pending deletion';

-- Create index for efficient queries on pending deletion users
CREATE INDEX IF NOT EXISTS idx_users_pending_deletion ON public.users (pending_deletion) WHERE pending_deletion = true;
