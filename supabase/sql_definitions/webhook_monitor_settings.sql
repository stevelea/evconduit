INSERT INTO public.settings (group_name, name, label, description, type, value)
VALUES ('Webhook Monitor', 'webhook.monitor.enabled', 'Enable Webhook Monitoring', 'Enable automatic webhook health monitoring', 'boolean', 'true')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.settings (group_name, name, label, description, type, value)
VALUES ('Webhook Monitor', 'webhook.monitor.max_failed_minutes', 'Max Failed Minutes', 'Minutes before a webhook is considered unhealthy', 'number', '720')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.settings (group_name, name, label, description, type, value)
VALUES ('Webhook Monitor', 'webhook.monitor.auto_reactivate', 'Auto Reactivate', 'Automatically send test webhooks to inactive endpoints', 'boolean', 'true')
ON CONFLICT (name) DO NOTHING;
