#!/bin/bash
# Build + package Glass for Komari theme release
# Usage: ./release.sh [version]
#   version: vX.Y.Z — if omitted, reads from komari-theme.json
# Requires: gh CLI (for GitHub release)

set -e

cd "$(dirname "$0")"

# 1. Build single-file index.html from src/
echo "==> [1/4] Building index.html from src/..."
./build.sh

# 2. Determine version
if [ -n "$1" ]; then
    VERSION="$1"
    echo "==> [2/4] Using version: $VERSION"
else
    VERSION="v$(python3 -c "import json; print(json.load(open('komari-theme.json'))['version'])")"
    echo "==> [2/4] Version from komari-theme.json: $VERSION"
fi

# 3. Package into Komari-compatible zip
PKG_NAME="Glass-${VERSION}.zip"
PKG_DIR="/tmp/Glass-${VERSION}"
echo "==> [3/4] Packaging: $PKG_NAME"

rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR/dist"
cp index.html "$PKG_DIR/dist/"
cp komari-theme.json "$PKG_DIR/"
cp icon.svg "$PKG_DIR/" 2>/dev/null || true
cp preview.png "$PKG_DIR/" 2>/dev/null || true

cd /tmp
rm -f "$PKG_NAME"
zip -r "$PKG_NAME" "Glass-${VERSION}/"
rm -rf "$PKG_DIR"
ls -lh "$PKG_NAME"

# 4. Push tag and create GitHub release
echo "==> [4/4] Pushing to GitHub..."
cd - > /dev/null

git add komari-theme.json -A 2>/dev/null || true
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
