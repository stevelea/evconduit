INSERT INTO public.settings (group_name, name, label, description, type, value)
VALUES
('Rate Limits', 'rate_limit.free.max_calls', 'Free Tier Max API Calls', 'Maximum API calls per month for Free tier users.', 'number', '300'),
('Rate Limits', 'rate_limit.basic.max_calls', 'Basic Tier Max API Calls', 'Maximum API calls per month per vehicle for Basic tier users.', 'number', '2500'),
('Rate Limits', 'rate_limit.pro.max_calls', 'Pro Tier Max API Calls', 'Maximum API calls per month per vehicle for Pro tier users.', 'number', '10000'),
('Rate Limits', 'rate_limit.basic.max_linked_vehicles', 'Basic Tier Max Linked Vehicles', 'Maximum number of linked vehicles for Basic tier users.', 'number', '2'),
('Rate Limits', 'rate_limit.pro.max_linked_vehicles', 'Pro Tier Max Linked Vehicles', 'Maximum number of linked vehicles for Pro tier users.', 'number', '5')
ON CONFLICT (name) DO UPDATE SET
value = EXCLUDED.value,
label = EXCLUDED.label,
description = EXCLUDED.description,
type = EXCLUDED.type,
group_name = EXCLUDED.group_name;