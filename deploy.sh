#!/bin/bash
# Deploy Glass to Komari server
# Usage: ./deploy.sh

set -e

# Step 1: Build from src/
echo "==> Building..."
bash build.sh

STATIC_FILE="/home/woioeow/glass/index.html"
FONTS_DIR="/home/woioeow/glass/fonts"
SSH_KEY="$HOME/.ssh/hermes_admin"
SSH="ssh -o StrictHostKeyChecking=no -i $SSH_KEY -p 46748 root@31.58.51.127"
SCP="scp -o StrictHostKeyChecking=no -i $SSH_KEY -P 46748"
REMOTE="/opt/komari/data/theme"

echo "==> Using build artifact: $STATIC_FILE ($(wc -c < "$STATIC_FILE") bytes)"

echo "==> Uploading HTML..."
$SCP "$STATIC_FILE" root@31.58.51.127:/tmp/index-glass.html

echo "==> Deploying HTML..."
$SSH "cp /tmp/index-glass.html $REMOTE/index.html && rm /tmp/index-glass.html"

echo "==> Syncing fonts..."
$SSH "mkdir -p $REMOTE/fonts"
$SCP $FONTS_DIR/Inter-*.ttf root@31.58.51.127:$REMOTE/fonts/

echo "==> Verifying..."
$SSH "ls -la $REMOTE/index.html && wc -c $REMOTE/index.html && curl -s http://127.0.0.1:25774/ | head -3"

echo "==> Done! https://stat.357561.xyz/"
