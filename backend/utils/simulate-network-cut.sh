#!/usr/bin/env bash
# Expérience 3 — coupure réseau ~5 s vers les ports du banc de test.
# Usage : sudo ./utils/simulate-network-cut.sh [durée_secondes]
#
# Pourquoi pas seulement « tc sur eth0 » ?
# - WebSocket et SSE du dashboard ciblent localhost:3001/3002 → trafic sur l'interface lo.
# - WebTransport utilise l'IP de la page (ex. 172.x:3003) → trafic sur wlp*/eth0.
# Il faut bloquer par PORT sur toutes les interfaces, pas seulement sur eth0.

set -euo pipefail

DURATION="${1:-5}"
PORTS_TCP="3001,3002,3003,4200"

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Relancer avec sudo : sudo $0 ${DURATION}"
  exit 1
fi

cleanup() {
  iptables -D INPUT -p tcp -m multiport --dports "${PORTS_TCP}" -j DROP 2>/dev/null || true
  iptables -D INPUT -p udp --dport 3003 -j DROP 2>/dev/null || true
  iptables -D OUTPUT -p tcp -m multiport --dports "${PORTS_TCP}" -j DROP 2>/dev/null || true
  iptables -D OUTPUT -p udp --dport 3003 -j DROP 2>/dev/null || true
}
trap cleanup EXIT

echo "Coupure ${DURATION}s sur TCP ${PORTS_TCP} + UDP 3003 (INPUT+OUTPUT, dont lo)…"
iptables -I INPUT -p tcp -m multiport --dports "${PORTS_TCP}" -j DROP
iptables -I INPUT -p udp --dport 3003 -j DROP
iptables -I OUTPUT -p tcp -m multiport --dports "${PORTS_TCP}" -j DROP
iptables -I OUTPUT -p udp --dport 3003 -j DROP

sleep "${DURATION}"

echo "Coupure terminée — trafic rétabli."
