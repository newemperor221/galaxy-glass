#!/bin/bash
# Deploy GalaxyGlass static version to Komari server
# Usage: ./deploy.sh

set -e

STATIC_FILE="/home/woioeow/galaxy-glass/index.html"
SSH_KEY="$HOME/.ssh/hermes_admin"
SSH="ssh -o StrictHostKeyChecking=no -i $SSH_KEY -p 46748 root@31.58.51.127"
SCP="scp -o StrictHostKeyChecking=no -i $SSH_KEY -P 46748"
REMOTE="/opt/komari/data/theme/GalaxyGlass/dist"

echo "==> Using static version: $STATIC_FILE ($(wc -c < "$STATIC_FILE") bytes)"

echo "==> Uploading..."
$SCP "$STATIC_FILE" root@31.58.51.127:/tmp/index-static.html

echo "==> Deploying on server..."
$SSH "cp /tmp/index-static.html $REMOTE/index.html && rm /tmp/index-static.html && echo '--- Deployed: ' && ls -la $REMOTE/index.html"

echo "==> Verifying..."
$SSH "cd $REMOTE && echo '--- index.html: ' && head -3 index.html && echo '--- size: ' && wc -c index.html"

echo "==> Done! https://stat.357561.xyz/"
