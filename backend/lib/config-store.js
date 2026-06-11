import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const CONFIG_PATH = join(dirname(fileURLToPath(import.meta.url)), '../../data/experiment-config.json');
const DEFAULT_MS = 1000;

let intervalMs = DEFAULT_MS;
let paused = false;

function writeConfig() {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify({ intervalMs, paused }, null, 2));
}

function load() {
  try {
    if (!existsSync(CONFIG_PATH)) return;
    const data = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    if (typeof data.intervalMs === 'number' && data.intervalMs >= 10) intervalMs = data.intervalMs;
    if (typeof data.paused === 'boolean') paused = data.paused;
  } catch {
    /* garde la valeur en mémoire */
  }
}

export function getIntervalMs() {
  return intervalMs;
}

export function getMessagesPerSecond() {
  return Math.round((1000 / intervalMs) * 10) / 10;
}

export function getPaused() {
  return paused;
}

export function setPaused(value) {
  paused = !!value;
  writeConfig();
  console.log(`Envoi ${paused ? 'en pause' : 'repris'} sur les 3 serveurs`);
  return paused;
}

export function setIntervalMs(ms) {
  const n = Math.max(10, Math.min(60_000, Math.round(Number(ms) || DEFAULT_MS)));
  intervalMs = n;
  writeConfig();
  console.log(`Intervalle d'envoi : ${n} ms (~${getMessagesPerSecond()} msg/s)`);
  return n;
}

load();
try {
  watch(CONFIG_PATH, () => load());
} catch {
  /* fichier pas encore créé */
}
