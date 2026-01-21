-- supabase/sql_definitions/user_updates_table.sql
-- Table for storing user-facing news/updates shown on the dashboard

-- Enable the moddatetime extension if not already enabled
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

-- Create the user_updates table
CREATE TABLE IF NOT EXISTS public.user_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments
COMMENT ON TABLE public.user_updates IS 'Stores news/update items displayed on user dashboards.';
COMMENT ON COLUMN public.user_updates.title IS 'Short title for the update.';
COMMENT ON COLUMN public.user_updates.content IS 'The update content/message.';
COMMENT ON COLUMN public.user_updates.is_active IS 'Whether this update is currently visible to users.';
COMMENT ON COLUMN public.user_updates.priority IS 'Display order priority (higher = shown first).';

-- Create a trigger to automatically update the updated_at timestamp
DROP TRIGGER IF EXISTS handle_user_updates_updated_at ON public.user_updates;
CREATE TRIGGER handle_user_updates_updated_at
BEFORE UPDATE ON public.user_updates
FOR EACH ROW
EXECUTE PROCEDURE moddatetime (updated_at);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.user_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to read active updates
CREATE POLICY "Allow authenticated users to read active updates"
ON public.user_updates
FOR SELECT
TO authenticated
USING (is_active = true);

-- Service role can do everything (for admin API)
CREATE POLICY "Service role full access"
ON public.user_updates
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_user_updates_active_priority
ON public.user_updates (is_active, priority DESC, created_at DESC);
