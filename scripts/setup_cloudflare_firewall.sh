#!/bin/bash
# Cloudflare-only Firewall Setup Script
# This script configures UFW to only allow web traffic from Cloudflare IPs

set -e

echo "=== Cloudflare Firewall Setup ==="
echo ""

# Reset UFW to defaults (careful - keeps SSH rule if we add it first)
echo "[1/5] Resetting UFW rules..."
ufw --force reset

# CRITICAL: Allow SSH first to prevent lockout
echo "[2/5] Allowing SSH (port 22) from anywhere..."
ufw allow ssh

# Allow localhost (for internal services)
echo "[3/5] Allowing localhost..."
ufw allow from 127.0.0.1

# Cloudflare IPv4 ranges
CLOUDFLARE_IPS_V4=(
    "173.245.48.0/20"
    "103.21.244.0/22"
    "103.22.200.0/22"
    "103.31.4.0/22"
    "141.101.64.0/18"
    "108.162.192.0/18"
    "190.93.240.0/20"
    "188.114.96.0/20"
    "197.234.240.0/22"
    "198.41.128.0/17"
    "162.158.0.0/15"
    "104.16.0.0/13"
    "104.24.0.0/14"
    "172.64.0.0/13"
    "131.0.72.0/22"
)

# Cloudflare IPv6 ranges
CLOUDFLARE_IPS_V6=(
    "2400:cb00::/32"
    "2606:4700::/32"
    "2803:f800::/32"
    "2405:b500::/32"
    "2405:8100::/32"
    "2a06:98c0::/29"
    "2c0f:f248::/32"
)

echo "[4/5] Adding Cloudflare IP rules for HTTP/HTTPS..."

# Add IPv4 rules
for ip in "${CLOUDFLARE_IPS_V4[@]}"; do
    echo "  Adding $ip for ports 80,443..."
    ufw allow from "$ip" to any port 80,443 proto tcp
done

# Add IPv6 rules
for ip in "${CLOUDFLARE_IPS_V6[@]}"; do
    echo "  Adding $ip for ports 80,443..."
    ufw allow from "$ip" to any port 80,443 proto tcp
done

# Set default policies
echo "[5/5] Setting default policies..."
ufw default deny incoming
ufw default allow outgoing

# Enable UFW
echo ""
echo "=== Enabling Firewall ==="
ufw --force enable

echo ""
echo "=== Firewall Status ==="
ufw status numbered

echo ""
echo "=== Setup Complete ==="
echo ""
echo "IMPORTANT: Make sure you've enabled Cloudflare proxy (orange cloud)"
echo "on your DNS records before relying on this firewall!"
echo ""
echo "Your origin IP (77.42.77.249) is now protected."
echo "Direct access to ports 80/443 will be blocked except from Cloudflare."
