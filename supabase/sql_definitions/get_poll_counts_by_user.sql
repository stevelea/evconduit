-- Function to get poll counts per user for the last N days
-- Uses SQL GROUP BY for efficient aggregation instead of fetching all rows
CREATE OR REPLACE FUNCTION get_poll_counts_by_user(days_ago integer DEFAULT 30)
RETURNS TABLE (user_id uuid, poll_count bigint)
LANGUAGE sql
STABLE
AS $$
    SELECT
        pl.user_id,
        COUNT(*) as poll_count
    FROM poll_logs pl
    WHERE pl.created_at >= (NOW() - (days_ago || ' days')::interval)
    GROUP BY pl.user_id;
$$;
