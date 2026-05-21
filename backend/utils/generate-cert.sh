#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
source "$(dirname "$0")/wt-host.sh"

WT_IP="$(get_wt_ip)"
SAN="DNS:localhost,IP:127.0.0.1"
if [[ "$WT_IP" != "127.0.0.1" ]]; then
  SAN="${SAN},IP:${WT_IP}"
fi

CN="${WT_IP}"
[[ "$WT_IP" == "127.0.0.1" ]] && CN="localhost"

openssl ecparam -name prime256v1 -genkey -noout -out key.pem
openssl req -x509 -key key.pem -out cert.pem -days 13 -subj "/CN=${CN}" \
  -addext "subjectAltName=${SAN}"

HASH=$(openssl x509 -in cert.pem -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64)

CONFIG="../frontend/src/app/wt-config.ts"
cat > "$CONFIG" <<EOF
/** Généré par backend/utils/generate-cert.sh — ne pas modifier à la main. */
export const WT_PORT = 3003;
export const WT_HASH_BASE64 = '${HASH}';
/** IP recommandée (WSL eth0 ou LAN). Ouvrir l’app via http://\${WT_SETUP_HOST}:4200 depuis Chrome. */
export const WT_SETUP_HOST = '${WT_IP}';
EOF

echo "Certificat ECDSA généré (13 jours)."
echo "  SAN: ${SAN}"
echo "  IP setup: ${WT_IP}"
echo "  Hash SPKI: ${HASH}"
echo "  → frontend/src/app/wt-config.ts"
echo ""
echo "⚠️  Redémarrer obligatoirement: npm run webtransport (le serveur charge cert.pem au démarrage)"
echo ""
if is_wsl; then
  echo "WSL2 : depuis Chrome Windows, ouvrir http://${WT_IP}:4200 (pas localhost)."
  echo "  ng serve --host 0.0.0.0"
else
  echo "Ouvrir http://${WT_IP}:4200 ou http://localhost:4200 selon où tourne Chrome."
fi
