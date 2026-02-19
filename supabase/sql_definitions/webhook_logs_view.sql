-- Create webhook_logs_view for admin dashboard
-- This view adds text-searchable columns for user_id and vehicle_id
-- Also joins with users table to get email for user: events

CREATE OR REPLACE VIEW public.webhook_logs_view AS
SELECT
    wl.id,
    wl.created_at,
    wl.payload,
    wl.user_id,
    wl.vehicle_id,
    wl.event,
    wl.event_type,
    wl.version,
    -- Text versions for filtering/searching
    wl.user_id::text AS user_id_text,
    wl.vehicle_id::text AS vehicle_id_text,
    -- User email from users table (for user: events)
    u.email AS user_email
FROM public.webhook_logs wl
LEFT JOIN public.users u ON wl.user_id = u.id::text
ORDER BY wl.created_at DESC;

-- Grant access to authenticated users (for admin access)
GRANT SELECT ON public.webhook_logs_view TO authenticated;
GRANT SELECT ON public.webhook_logs_view TO service_role;
