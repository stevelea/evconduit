-- Add enode_account_id foreign key to users table
-- Links each user to their assigned Enode account

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS enode_account_id UUID REFERENCES enode_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_enode_account_id ON users(enode_account_id);
