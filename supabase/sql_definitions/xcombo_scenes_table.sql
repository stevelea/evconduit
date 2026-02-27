-- XCombo Scenes table for community XPeng XCombo scene catalogue
CREATE TABLE IF NOT EXISTS xcombo_scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    submitted_by TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    install_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient listing of approved scenes
CREATE INDEX IF NOT EXISTS idx_xcombo_scenes_status_created
    ON xcombo_scenes (status, created_at DESC);
