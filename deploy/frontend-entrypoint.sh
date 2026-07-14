#!/bin/sh
# Génère /usr/share/nginx/html/env.js à partir des variables d'environnement du conteneur.
set -eu
cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV__ = {
  WS_URL: "${WS_URL:-}",
  SSE_URL: "${SSE_URL:-}",
  WT_URL: "${WT_URL:-}"
};
EOF
echo "env.js écrit (WS_URL=${WS_URL:-}, SSE_URL=${SSE_URL:-}, WT_URL=${WT_URL:-})"
