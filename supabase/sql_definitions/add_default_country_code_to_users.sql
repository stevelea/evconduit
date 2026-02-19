-- Add default_country_code column to users table
-- This allows admins to set a fallback country for users whose vehicles don't report GPS

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS default_country_code VARCHAR(2);

-- Add comment explaining the purpose
COMMENT ON COLUMN public.users.default_country_code IS 'Admin-settable default country code (ISO 3166-1 alpha-2) used when vehicle does not report GPS location';
