-- Create webhook_logs_view for admin dashboard
-- This view adds text-searchable columns for user_id and vehicle_id

CREATE OR REPLACE VIEW public.webhook_logs_view AS
SELECT
    id,
    created_at,
    payload,
    user_id,
    vehicle_id,
    event,
    event_type,
    version,
    -- Text versions for filtering/searching
    user_id::text AS user_id_text,
    vehicle_id::text AS vehicle_id_text
FROM public.webhook_logs
ORDER BY created_at DESC;

-- Grant access to authenticated users (for admin access)
GRANT SELECT ON public.webhook_logs_view TO authenticated;
GRANT SELECT ON public.webhook_logs_view TO service_role;
