#!/usr/bin/env bash
# IP à utiliser pour WebTransport (WSL2, LAN, ou loopback en secours).

is_wsl() {
  grep -qiE '(microsoft|WSL)' /proc/version 2>/dev/null
}

# WSL2 : IP de eth0 (Chrome Windows → cette IP, pas localhost — UDP fragmenté sur le pont WSL)
# Natif : première IP de hostname -I (souvent la carte Wi‑Fi/Ethernet)
get_wt_ip() {
  local ip=""

  if is_wsl; then
    ip=$(ip -4 addr show eth0 2>/dev/null | awk '/inet / {print $2}' | cut -d/ -f1 | head -1)
  fi

  if [[ -z "$ip" ]]; then
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  fi

  if [[ -z "$ip" ]]; then
    ip="127.0.0.1"
  fi

  echo "$ip"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  get_wt_ip
fi
