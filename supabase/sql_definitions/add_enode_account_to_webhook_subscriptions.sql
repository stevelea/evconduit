-- Add enode_account_id to webhook_subscriptions table
-- Links each webhook subscription to the Enode account it belongs to

ALTER TABLE webhook_subscriptions
    ADD COLUMN IF NOT EXISTS enode_account_id UUID REFERENCES enode_accounts(id) ON DELETE SET NULL;
