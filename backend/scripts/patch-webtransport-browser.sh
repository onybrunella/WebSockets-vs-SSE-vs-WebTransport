#!/usr/bin/env bash
# Corrige wss://host:port//path → wss://host:port/path (bug @fails-components/webtransport)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET='lib/http2/browser/browser.js'
OLD="if (path) url = url + '/' + path"
NEW="if (path) url = url + (path.startsWith('/') ? path : '/' + path)"

for base in "$ROOT/node_modules/@fails-components/webtransport" \
  "$ROOT/../frontend/node_modules/@fails-components/webtransport"; do
  file="$base/$TARGET"
  if [[ -f "$file" ]] && grep -qF "$OLD" "$file"; then
    sed -i "s|$(printf '%s' "$OLD" | sed 's/[&/\]/\\&/g')|$(printf '%s' "$NEW" | sed 's/[&/\]/\\&/g')|" "$file"
    echo "Patch appliqué : $file"
  fi
done
