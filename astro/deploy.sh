#!/bin/bash
# Deploy GalaxyGlass Astro build to server (komari theme subdirectory)
set -e

BUILD="/home/woioeow/galaxy-glass/astro/dist"
SSH_KEY="$HOME/.ssh/hermes_admin"
SSH="ssh -o StrictHostKeyChecking=no -i $SSH_KEY -p 46748 root@31.58.51.127"
SCP="scp -o StrictHostKeyChecking=no -i $SSH_KEY -P 46748"
REMOTE_THEME="/opt/komari/data/theme/GalaxyGlass"

echo "==> Packing build..."
cd "$BUILD"
tar czf /tmp/galaxy-astro-deploy.tar.gz .

echo "==> Uploading..."
$SCP /tmp/galaxy-astro-deploy.tar.gz root@31.58.51.127:/tmp/

echo "==> Extracting on server (replacing GalaxyGlass/dist)..."
$SSH "cd $REMOTE_THEME && rm -rf dist && mkdir dist && cd dist && tar xzf /tmp/galaxy-astro-deploy.tar.gz && mv detail/index.html detail.html && rm -rf detail && rm /tmp/galaxy-astro-deploy.tar.gz"

echo "==> Verifying..."
$SSH "ls -la $REMOTE_THEME/dist/ && echo '--- index.html: ' && head -3 $REMOTE_THEME/dist/index.html"

echo "==> Done! https://stat.357561.xyz/"
