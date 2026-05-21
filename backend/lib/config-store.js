import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '../../data/experiment-config.json');
const DEFAULT_MS = 1000;

let intervalMs = DEFAULT_MS;

function loadFromDisk() {
  try {
    if (!existsSync(CONFIG_PATH)) return;
    const data = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    if (typeof data.intervalMs === 'number' && data.intervalMs >= 10) {
      intervalMs = data.intervalMs;
    }
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

export function setIntervalMs(ms) {
  const n = Math.max(10, Math.min(60_000, Math.round(Number(ms) || DEFAULT_MS)));
  intervalMs = n;
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify({ intervalMs: n }, null, 2));
  console.log(`Intervalle d'envoi : ${n} ms (~${getMessagesPerSecond()} msg/s)`);
  return n;
}

loadFromDisk();
try {
  watch(CONFIG_PATH, () => loadFromDisk());
} catch {
  /* fichier pas encore créé */
}
