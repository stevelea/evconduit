#!/bin/bash

# Backup original .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Create temporary file
temp_file=$(mktemp)

# Process .env file - keep only the last occurrence of each variable
# and fix the API URL
awk '
BEGIN { FS="=" }
{
    # Skip empty lines and comments
    if ($0 ~ /^[[:space:]]*$/ || $0 ~ /^[[:space:]]*#/) {
        next
    }
    
    # Store the line with variable name as key
    var = $1
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", var)  # trim whitespace
    
    # Fix the API URL if found
    if (var == "NEXT_PUBLIC_API_BASE_URL") {
        # Use the correct backend URL with /api
        lines[var] = "NEXT_PUBLIC_API_BASE_URL=https://backend.evconduit.com/api"
    } else {
        lines[var] = $0
    }
    
    # Track order of variables
    if (!(var in order)) {
        order[var] = ++count
    }
}
END {
    # Sort by original order and print
    n = asorti(order, sorted_vars, "@val_num_asc")
    for (i = 1; i <= n; i++) {
        print lines[sorted_vars[i]]
    }
}
' .env > "$temp_file"

# Replace original with cleaned version
mv "$temp_file" .env

echo "✅ .env file cleaned!"
echo "📝 Backup saved to: .env.backup.$(date +%Y%m%d)_*"
echo ""
echo "Cleaned environment variables:"
grep "NEXT_PUBLIC" .env
