#!/bin/bash

# Backup
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Remove all NEXT_PUBLIC lines and rebuild them correctly
grep -v "^NEXT_PUBLIC" .env > .env.temp

# Add the correct NEXT_PUBLIC variables (only once)
cat >> .env.temp << 'EOF'
NEXT_PUBLIC_API_BASE_URL=https://backend.evconduit.com/api
NEXT_PUBLIC_SUPABASE_URL=https://pynxbiclcdhkstglldvh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5bnhiaWNsY2Roa3N0Z2xsZHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3ODUzMjMsImV4cCI6MjA4MjM2MTMyM30.uSz-3L0GGF-MlxzEEYmk7pZHGpOWJ3WYpUhPmUQQAd4
EOF

# Replace
mv .env.temp .env

echo "✅ Done!"
echo ""
echo "NEXT_PUBLIC variables:"
grep "NEXT_PUBLIC" .env
