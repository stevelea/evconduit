-- Add source column to vehicles table to distinguish between Enode and ABRP vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'enode';
