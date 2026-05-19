#!/bin/bash
# Deploy GalaxyGlass v3 (Svelte 5 + Skeleton) to Komari server
# Usage: ./deploy-svelte.sh

set -e

BUILD="/home/woioeow/galaxy-glass/svelte/build"
PASS='OX8w$nE9A%tfqb6v'
SSH="sshpass -p '$PASS' ssh -p 46748 root@31.58.51.127"
SCP="sshpass -p '$PASS' scp -P 46748"
REMOTE="/opt/komari/data/theme/GalaxyGlass-v3"

echo "==> Packing build..."
cd "$BUILD"
tar czf /tmp/galaxy-v3-deploy.tar.gz .

echo "==> Uploading..."
$SCP /tmp/galaxy-v3-deploy.tar.gz root@31.58.51.127:/tmp/

echo "==> Extracting on server..."
$SSH "mkdir -p $REMOTE && cd $REMOTE && rm -rf * && tar xzf /tmp/galaxy-v3-deploy.tar.gz && rm /tmp/galaxy-v3-deploy.tar.gz"

echo "==> Verifying..."
$SSH "ls -la $REMOTE/ && echo '---' && head -5 $REMOTE/index.html"

echo "Deploy complete. Point your reverse proxy to: $REMOTE"
