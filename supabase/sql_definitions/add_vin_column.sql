-- Add VIN column to vehicles table for better vehicle matching on relink
-- This allows matching by VIN instead of Enode vehicle_id, which changes on relink

-- Add the column
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);

-- Create unique constraint on user_id + vin (same car can't be linked twice for same user)
-- Note: This allows NULL vins (for vehicles without VIN data)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_user_vin
ON vehicles(user_id, vin)
WHERE vin IS NOT NULL;

-- Populate VIN from existing vehicle_cache data
UPDATE vehicles
SET vin = vehicle_cache::jsonb->'information'->>'vin'
WHERE vin IS NULL
AND vehicle_cache IS NOT NULL
AND vehicle_cache::jsonb->'information'->>'vin' IS NOT NULL;
