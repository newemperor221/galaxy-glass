#!/bin/bash
# Deploy GalaxyGlass to Komari server
# Usage: ./deploy.sh

set -e

SRC="/home/woioeow/galaxy-glass/src"
PASS='OX8w$nE9A%tfqb6v'
SSH="sshpass -p '$PASS' ssh -p 46748 root@31.58.51.127"
SCP="sshpass -p '$PASS' scp -P 46748"
REMOTE="/opt/komari/data/theme"

echo "==> Packing source..."
cd "$SRC/.."
tar czf /tmp/galaxy-deploy.tar.gz -C src index.html styles/ scripts/

echo "==> Uploading..."
$SCP /tmp/galaxy-deploy.tar.gz root@31.58.51.127:/tmp/
$SCP /opt/komari/galaxy-proxy.py /tmp/galaxy-proxy.py.bak 2>/dev/null || true
$SCP /tmp/galaxy-proxy.py root@31.58.51.127:/opt/komari/galaxy-proxy.py 2>/dev/null || true

echo "==> Extracting..."
$SSH "cd $REMOTE && rm -f styles/*.css scripts/*.js index.html && tar xzf /tmp/galaxy-deploy.tar.gz && rm /tmp/galaxy-deploy.tar.gz"

echo "==> Restarting proxy..."
$SSH "pkill -f 'galaxy-proxy' 2>/dev/null; sleep 1; nohup python3 /opt/komari/galaxy-proxy.py >/dev/null 2>&1 &"

echo "==> Done! Verifying..."
sleep 2
$SSH "curl -sI http://127.0.0.1:25774/ | head -1"
echo "Deploy complete."
