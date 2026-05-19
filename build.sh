#!/bin/bash
# Build GalaxyGlass from src/ into a single self-contained index.html
# CSS inlined in ITCSS order: settings → base → layout → components → states → utilities → web → mobile
# Usage: ./build.sh

set -e

echo "==> Building GalaxyGlass from src/..."

SRC="src"

python3 << 'PYEOF'
import os

SRC = 'src'

# Read template
with open(f'{SRC}/index.html') as f:
    template = f.read()

# Inline CSS in ITCSS order (settings → base → layout → components → states → utilities → web → mobile)
CSS_ORDER = [
    'settings.css',
    'base.css',
    'layout.css',
    'components.css',
    'states.css',
    'utilities.css',
    'web.css',
    'mobile.css'
]

css_parts = []
for fname in CSS_ORDER:
    fpath = f'{SRC}/styles/{fname}'
    if os.path.isfile(fpath):
        content = open(fpath).read()
        if content.strip() and 'Merged into' not in content:
            css_parts.append(content)

css = '\n'.join(css_parts)

# Read single app.js
js = open(f'{SRC}/scripts/app.js').read()

# Read body
body = open(f'{SRC}/body.html').read()

# Substitute placeholders
result = template.replace('{{CSS}}', css).replace('{{JS}}', js).replace('{{BODY}}', body)

with open('index.html', 'w') as f:
    f.write(result)

size = len(result.encode('utf-8'))
print(f'==> Built: index.html ({size} bytes)')

# Verify
with open('index.html') as f:
    h = f.read()
for ph in ['{{CSS}}', '{{JS}}', '{{BODY}}']:
    assert ph not in h, f'{ph} not replaced!'
print('==> Verification passed ✅')
PYEOF
