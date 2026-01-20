-- Add country_code column to vehicles table for caching reverse geocode results
-- This avoids repeated reverse geocoding for the same location

ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

-- Add index for efficient country-based queries
CREATE INDEX IF NOT EXISTS idx_vehicles_country_code ON public.vehicles(country_code);

COMMENT ON COLUMN public.vehicles.country_code IS 'ISO 3166-1 alpha-2 country code from reverse geocoding vehicle location';
