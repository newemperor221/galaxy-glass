#!/bin/bash
# Deploy Glass to Komari server (Singapore)
# Usage: ./deploy.sh
# Note: Configure SSH key/password in $SSH below before deploying

set -e

# Step 1: Build from src/
echo "==> Building..."
bash build.sh

STATIC_FILE="/home/woioeow/glass/index.html"
FONTS_DIR="/home/woioeow/glass/fonts"
VIDEO_DIR="/home/woioeow/glass/video"
SSH_KEY="$HOME/.ssh/hermes_admin"
SSH="ssh -o StrictHostKeyChecking=no -i $SSH_KEY -p 10425 root@140.245.97.144"
SCP="scp -o StrictHostKeyChecking=no -i $SSH_KEY -P 10425"
REMOTE="/opt/komari/data/theme"

echo "==> Using build artifact: $STATIC_FILE ($(wc -c < "$STATIC_FILE") bytes)"

echo "==> Uploading HTML..."
$SCP "$STATIC_FILE" root@140.245.97.144:/tmp/index-glass.html

echo "==> Deploying HTML..."
$SSH "cp /tmp/index-glass.html $REMOTE/index.html && rm /tmp/index-glass.html"

echo "==> Syncing fonts..."
$SSH "mkdir -p $REMOTE/fonts"
$SCP $FONTS_DIR/Inter-*.ttf root@140.245.97.144:$REMOTE/fonts/

echo "==> Syncing wallpapers..."
$SSH "mkdir -p $REMOTE/video"
$SCP $VIDEO_DIR/desktop_wallpaper.jpg root@140.245.97.144:$REMOTE/video/
$SCP $VIDEO_DIR/mobile_wallpaper.jpg root@140.245.97.144:$REMOTE/video/

echo "==> Verifying..."
$SSH "ls -la $REMOTE/index.html && wc -c $REMOTE/index.html && curl -s http://127.0.0.1:25774/ | head -3"

echo "==> Done! https://stat.357561.xyz/"
