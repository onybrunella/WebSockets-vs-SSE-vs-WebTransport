#!/usr/bin/env bash
# WSL2 : Chrome Windows ne peut pas joindre QUIC sur localhost (UDP fragmenté).
# Utiliser l’IP WSL/LAN + serverCertificateHashes (souvent sans flags Chrome).

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/wt-host.sh"

WT_IP="$(get_wt_ip)"
WT_HOST_PORT="${WT_IP}:3003"
APP_URL="${1:-http://${WT_IP}:4200}"

SPKI_HASH=''
CONFIG="$SCRIPT_DIR/../../frontend/src/app/wt-config.ts"
if [[ -f "$CONFIG" ]]; then
  SPKI_HASH=$(grep "WT_HASH_BASE64" "$CONFIG" | sed "s/.*= '\\([^']*\\)'.*/\\1/")
fi
if [[ -z "$SPKI_HASH" ]]; then
  SPKI_HASH='LKWpa79hFkffqPxQuz3P+OWkYjydEgy7OZmZ6cpwDyU='
fi

CHROME=""
for candidate in google-chrome google-chrome-stable chromium chromium-browser chrome; do
  if command -v "$candidate" >/dev/null 2>&1; then
    CHROME="$candidate"
    break
  fi
done

if [[ -z "$CHROME" ]]; then
  echo "Aucun Chrome/Chromium trouvé." >&2
  exit 1
fi

if is_wsl; then
  echo "WSL2 détecté — IP eth0 : $WT_IP (ne pas utiliser localhost pour WebTransport)"
else
  echo "IP WebTransport : $WT_IP"
fi
echo "Lancement: $CHROME"
echo "  → $APP_URL"
echo ""
echo "Prérequis :"
echo "  1. ./utils/generate-cert.sh  (certificat + wt-config.ts)"
echo "  2. npm run webtransport"
echo "  3. ng serve --host 0.0.0.0   (depuis frontend/)"
echo ""
echo "Fermez toutes les fenêtres Chrome avant de relancer."

# http://IP:4200 n'est pas un "secure context" → WebTransport absent sans ce flag
CHROME_ARGS=(
  --user-data-dir="${TMPDIR:-/tmp}/chrome-webtransport-dev"
  --unsafely-treat-insecure-origin-as-secure="$APP_URL"
  --ignore-certificate-errors
  --ignore-certificate-errors-spki-list="$SPKI_HASH"
)

# Flags QUIC : utiles sur Linux natif ; sur WSL + IP LAN, souvent optionnels.
if [[ "$WT_IP" != "127.0.0.1" ]]; then
  CHROME_ARGS+=(--origin-to-force-quic-on="$WT_HOST_PORT")
else
  CHROME_ARGS+=(--enable-quic --origin-to-force-quic-on=127.0.0.1:3003)
fi

exec "$CHROME" "${CHROME_ARGS[@]}" "$APP_URL"
