-- useful_links: Admin-managed links displayed on the landing page banner
CREATE TABLE IF NOT EXISTS useful_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT,                          -- lucide icon name e.g. "Map", "Zap"
    is_external BOOLEAN DEFAULT false,  -- opens in new tab if true
    is_active BOOLEAN DEFAULT true,     -- soft delete / toggle visibility
    sort_order INTEGER DEFAULT 0,       -- display ordering
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_useful_links_active_sort
    ON useful_links (is_active, sort_order);

-- Seed the 4 existing hardcoded links
INSERT INTO useful_links (label, url, icon, is_external, is_active, sort_order) VALUES
    ('TomTom Map Update', '/tomtom', 'Map', false, true, 0),
    ('XCombo Catalog', '/xcombo', 'Zap', false, true, 1),
    ('Xpeng Oracle (Roel)', 'https://chatgpt.com/g/g-6821a8a535288191971bed6a27dd5277-xpeng-oracle', 'Bot', true, true, 2),
    ('Join Discord', 'https://discord.gg/6BzmqfZaAf', 'MessageCircle', true, true, 3);
