-- Add phone_verified_at column to track when phone was verified
-- This column stores the timestamp of phone verification

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS phone_verified_at timestamp with time zone NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.phone_verified_at IS 'Timestamp when the user phone number was verified via SMS';
