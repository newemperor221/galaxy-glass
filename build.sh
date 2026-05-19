#!/bin/bash
# Build GalaxyGlass from src/ into a single self-contained index.html
# Usage: ./build.sh

set -e

echo "==> Building GalaxyGlass from src/..."

# Use Python for reliable template substitution
python3 -c "
import os, re

src = 'src'

# Read template
with open(f'{src}/index.html') as f:
    template = f.read()

# Inline CSS (skip placeholder files)
css_parts = []
for fname in ['tokens.css', 'components.css', 'responsive.css']:
    fpath = f'{src}/styles/{fname}'
    if os.path.isfile(fpath):
        content = open(fpath).read()
        if 'Merged into' not in content and content.strip():
            css_parts.append(content)
css = '\n'.join(css_parts)

# Read JS
js = open(f'{src}/scripts/app.js').read()

# Read body
body = open(f'{src}/body.html').read()

# Substitute placeholders
result = template.replace('{{CSS}}', css).replace('{{JS}}', js).replace('{{BODY}}', body)

# Write output
with open('index.html', 'w') as f:
    f.write(result)

size = len(result.encode('utf-8'))
print(f'==> Built: index.html ({size} bytes)')
print(f'    CSS: {len(css)} chars | JS: {len(js)} chars | Body: {len(body)} chars')
"

# Verify
python3 -c "
with open('index.html') as f:
    h = f.read()
assert '{{CSS}}' not in h, 'CSS placeholder not replaced!'
assert '{{JS}}' not in h, 'JS placeholder not replaced!'
assert '{{BODY}}' not in h, 'Body placeholder not replaced!'
assert '<style>' in h, 'Missing <style> tag'
assert '<script>' in h, 'Missing <script> tag'
print('==> Verification passed ✅')
"