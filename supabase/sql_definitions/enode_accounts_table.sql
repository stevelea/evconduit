-- enode_accounts: Stores credentials and configuration for multiple Enode API accounts.
-- Each account has its own client_id/secret, webhook secret, and vehicle capacity limit.

CREATE TABLE IF NOT EXISTS enode_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    webhook_secret TEXT NOT NULL,
    base_url TEXT NOT NULL DEFAULT 'https://enode-api.production.enode.io',
    auth_url TEXT NOT NULL DEFAULT 'https://oauth.production.enode.io/oauth2/token',
    webhook_url TEXT,
    redirect_uri TEXT,
    max_vehicles INTEGER NOT NULL DEFAULT 4,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- RLS policies
ALTER TABLE enode_accounts ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access on enode_accounts"
    ON enode_accounts
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE enode_accounts IS 'Enode API account credentials and configuration for multi-account support';
COMMENT ON COLUMN enode_accounts.max_vehicles IS 'Maximum number of vehicles allowed on this Enode account';
COMMENT ON COLUMN enode_accounts.is_active IS 'Whether this account is available for new user assignments';
