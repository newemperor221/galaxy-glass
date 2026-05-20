#!/bin/bash
# Build + package Glass for Komari theme release
# Usage: ./release.sh [version]
#   version: vX.Y.Z — if omitted, reads from komari-theme.json
# Requires: gh CLI (for GitHub release)

set -e

cd "$(dirname "$0")"
ORIG_DIR="$PWD"

# 1. Build single-file index.html from src/
echo "==> [1/4] Building index.html from src/..."
./build.sh

# 2. Determine version and sync to komari-theme.json
if [ -n "$1" ]; then
    VERSION="$1"
    echo "==> [2/4] Using version: $VERSION"
else
    VERSION="v$(python3 -c "import json; print(json.load(open('komari-theme.json'))['version'])")"
    echo "==> [2/4] Version from komari-theme.json: $VERSION"
fi

# Sync version to komari-theme.json (strip 'v' prefix)
VER_NUM="${VERSION#v}"
python3 << PYEOF
import json
with open('komari-theme.json') as f:
    d = json.load(f)
d['version'] = '$VER_NUM'
with open('komari-theme.json', 'w') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
    f.write('\n')
print(f'komari-theme.json version -> {d["version"]}')
PYEOF

# 3. Package into Komari-compatible zip
PKG_NAME="Glass-${VERSION}.zip"
PKG_DIR="/tmp/Glass-${VERSION}"
echo "==> [3/4] Packaging: $PKG_NAME"

rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR/dist/fonts"
cp index.html "$PKG_DIR/dist/"
cp komari-theme.json "$PKG_DIR/"
cp icon.svg "$PKG_DIR/" 2>/dev/null || true
cp preview.webp "$PKG_DIR/" 2>/dev/null || true
cp -r video "$PKG_DIR/video" 2>/dev/null || true
cp fonts/Inter-*.ttf "$PKG_DIR/dist/fonts/" 2>/dev/null || true

cd /tmp
rm -f "$PKG_NAME"
cd "$PKG_DIR"
zip -r "/tmp/$PKG_NAME" .
cd /tmp
rm -rf "$PKG_DIR"
ls -lh "$PKG_NAME"
cd "$ORIG_DIR"

# 4. Push tag and create GitHub release
echo "==> [4/4] Pushing to GitHub..."

git add -A
git commit -m "chore: bump version to ${VERSION#v}" 2>/dev/null || true
git push origin main

# Delete existing tag if re-releasing
if git tag | grep -q "^${VERSION}$"; then
    git tag -d "$VERSION"
    git push origin ":refs/tags/${VERSION}" 2>/dev/null || true
fi

git tag "$VERSION"
git push origin "$VERSION"

# Extract release notes from git log
RELEASE_NOTES=$(git log --oneline --no-decorate "$(git tag --sort=-version:refname | head -2 | tail -1)..HEAD" 2>/dev/null | head -20 || echo "")

gh release create "$VERSION" \
    --title "Glass $VERSION" \
    --notes "$RELEASE_NOTES" \
    "/tmp/${PKG_NAME}"

echo ""
echo "============================================"
echo "  ✅ Glass $VERSION released!"
echo "  📦 https://github.com/newemperor221/glass/releases/tag/$VERSION"
echo "============================================"
