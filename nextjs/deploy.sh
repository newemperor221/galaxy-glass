#!/bin/bash
# Deploy GalaxyGlass Next.js build to Komari server
set -e

BUILD="/home/woioeow/galaxy-glass/nextjs/out"
PASS='OX8w$nE9A%tfqb6v'
SSH="sshpass -p '$PASS' ssh -p 46748 root@31.58.51.127"
SCP="sshpass -p '$PASS' scp -P 46748"
REMOTE="/opt/komari/data/theme/GalaxyGlass-Next"

echo "==> Packing build..."
cd "$BUILD"
tar czf /tmp/galaxy-next-deploy.tar.gz .

echo "==> Uploading..."
$SCP /tmp/galaxy-next-deploy.tar.gz root@31.58.51.127:/tmp/

echo "==> Extracting on server..."
$SSH "mkdir -p $REMOTE && cd $REMOTE && rm -rf * && tar xzf /tmp/galaxy-next-deploy.tar.gz && rm /tmp/galaxy-next-deploy.tar.gz"

echo "==> Verifying..."
$SSH "ls -la $REMOTE/ && echo '---' && head -5 $REMOTE/index.html"

echo "==> Done!"
echo "Next, configure your reverse proxy to serve from: $REMOTE"
echo "Or set as Komari theme: stat.357561.xyz/theme/GalaxyGlass-Next/"
