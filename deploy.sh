#!/bin/bash
# Deploy GalaxyGlass Next.js build to Komari server
# Usage: ./deploy.sh

set -e

BUILD="/home/woioeow/galaxy-glass/nextjs"
OUT="$BUILD/out"
SSH_KEY="$HOME/.ssh/hermes_admin"
SSH="ssh -o StrictHostKeyChecking=no -i $SSH_KEY -p 46748 root@31.58.51.127"
SCP="scp -o StrictHostKeyChecking=no -i $SSH_KEY -P 46748"
REMOTE="/opt/komari/data/theme"

echo "==> Building Next.js..."
cd "$BUILD"
npm run build

echo "==> Packing build output..."
cd "$OUT"
tar czf /tmp/galaxy-next-deploy.tar.gz .

echo "==> Uploading..."
$SCP /tmp/galaxy-next-deploy.tar.gz root@31.58.51.127:/tmp/

echo "==> Extracting on server..."
$SSH "cd $REMOTE && rm -rf index.html detail.html 404.html _not-found.html _not-found/ detail/ _next/ __next.*.txt index.txt detail.txt _not-found.txt styles/ scripts/ favicon.ico && tar xzf /tmp/galaxy-next-deploy.tar.gz && rm /tmp/galaxy-next-deploy.tar.gz"

echo "==> Verifying..."
$SSH "cd $REMOTE && echo '--- Files: ' && ls -la && echo '--- index.html: ' && head -3 index.html"

echo "==> Done! https://stat.357561.xyz/"
