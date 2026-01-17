-- Extend all existing users' trial period to 12 months from now
-- Run this once to give all users a 12-month Pro trial

UPDATE public.users
SET
    tier = 'pro',
    is_on_trial = TRUE,
    trial_ends_at = NOW() + INTERVAL '365 days'
WHERE
    -- Only update users who don't have an active paid subscription
    stripe_customer_id IS NULL
    OR stripe_customer_id = '';

-- If you want to extend ALL users regardless of subscription status, use this instead:
-- UPDATE public.users
-- SET
--     is_on_trial = TRUE,
--     trial_ends_at = NOW() + INTERVAL '365 days';

-- Verify the update
SELECT
    COUNT(*) as users_updated,
    MIN(trial_ends_at) as earliest_trial_end,
    MAX(trial_ends_at) as latest_trial_end
FROM public.users
WHERE is_on_trial = TRUE;
