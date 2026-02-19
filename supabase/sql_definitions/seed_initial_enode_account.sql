-- Seed the original Enode account from environment variables.
-- Run this AFTER creating the enode_accounts table and adding enode_account_id to users.
--
-- Replace the placeholder values below with your actual credentials before running.
-- This is a one-time migration script.

-- Step 1: Insert the original account
-- NOTE: Replace these placeholder values with actual env var values before running
INSERT INTO enode_accounts (id, name, client_id, client_secret, webhook_secret, base_url, auth_url, webhook_url, redirect_uri, max_vehicles, is_active, notes)
VALUES (
    gen_random_uuid(),
    'Primary Account',
    '{{ENODE_CLIENT_ID}}',
    '{{ENODE_CLIENT_SECRET}}',
    '{{ENODE_WEBHOOK_SECRET}}',
    '{{ENODE_BASE_URL}}',
    '{{ENODE_AUTH_URL}}',
    '{{WEBHOOK_URL}}',
    '{{REDIRECT_URI}}',
    50,  -- Set high for the original account that already has users
    TRUE,
    'Original account migrated from environment variables'
)
ON CONFLICT DO NOTHING;

-- Step 2: Assign all existing users to the original account
UPDATE users
SET enode_account_id = (SELECT id FROM enode_accounts ORDER BY created_at ASC LIMIT 1)
WHERE enode_account_id IS NULL;
