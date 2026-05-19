#!/bin/bash
# Build GalaxyGlass from src/ into a single self-contained index.html
# Usage: ./build.sh

set -e

echo "==> Building GalaxyGlass from src/..."

SRC="src"

# Use Python for reliable template substitution
python3 << 'PYEOF'
import os

SRC = 'src'

# Read template
with open(f'{SRC}/index.html') as f:
    template = f.read()

# Inline CSS (skip placeholder files)
css_parts = []
for fname in ['tokens.css', 'components.css', 'responsive.css']:
    fpath = f'{SRC}/styles/{fname}'
    if os.path.isfile(fpath):
        content = open(fpath).read()
        if 'Merged into' not in content and content.strip():
            css_parts.append(content)
css = '\n'.join(css_parts)

# Concat JS files in order: config → data → render → charts → events → squircle
js_order = ['config.js', 'data.js', 'render.js', 'charts.js', 'events.js', 'squircle.js']
js_parts = []
for fname in js_order:
    fpath = f'{SRC}/scripts/{fname}'
    if os.path.isfile(fpath):
        content = open(fpath).read()
        if 'Merged into' not in content and content.strip():
            js_parts.append(content)
js = '\n'.join(js_parts)

# Read body
body = open(f'{SRC}/body.html').read()

# Substitute placeholders
result = template.replace('{{CSS}}', css).replace('{{JS}}', js).replace('{{BODY}}', body)

# Write output
with open('index.html', 'w') as f:
    f.write(result)

size = len(result.encode('utf-8'))
print(f'==> Built: index.html ({size} bytes)')
print(f'    CSS: {len(css)} chars | JS: {len(js)} chars | Body: {len(body)} chars')

# Verify
with open('index.html') as f:
    h = f.read()
assert '{{CSS}}' not in h, 'CSS placeholder not replaced!'
assert '{{JS}}' not in h, 'JS placeholder not replaced!'
assert '{{BODY}}' not in h, 'Body placeholder not replaced!'
assert '<style>' in h, 'Missing <style> tag'
assert '<script>' in h, 'Missing <script> tag'
print('==> Verification passed ✅')
PYEOF
