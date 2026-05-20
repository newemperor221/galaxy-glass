#!/bin/bash
# Deploy Glass to Komari server
# Usage: ./deploy.sh

set -e

# Step 1: Build from src/
echo "==> Building..."
bash build.sh

STATIC_FILE="/home/woioeow/galaxy-glass/index.html"
SSH_KEY="$HOME/.ssh/hermes_admin"
SSH="ssh -o StrictHostKeyChecking=no -i $SSH_KEY -p 46748 root@31.58.51.127"
SCP="scp -o StrictHostKeyChecking=no -i $SSH_KEY -P 46748"
REMOTE="/opt/komari/data/theme/Glass/dist"
# TEMP: keep old path for migration period
REMOTE_OLD="/opt/komari/data/theme/GalaxyGlass/dist"

echo "==> Using build artifact: $STATIC_FILE ($(wc -c < "$STATIC_FILE") bytes)"

echo "==> Uploading..."
$SCP "$STATIC_FILE" root@31.58.51.127:/tmp/index-static.html

echo "==> Deploying on server..."
$SSH "cp /tmp/index-static.html $REMOTE/index.html && rm /tmp/index-static.html"
# Also copy to theme root for compatibility
$SSH "cp $REMOTE/index.html /opt/komari/data/theme/index.html"

echo "==> Verifying..."
$SSH "ls -la $REMOTE/index.html && wc -c $REMOTE/index.html && curl -s http://127.0.0.1:25774/ | head -3"

echo "==> Done! https://stat.357561.xyz/"
