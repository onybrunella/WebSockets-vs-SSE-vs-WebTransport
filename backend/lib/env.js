/**
 * Configuration runtime partagée (local + Docker / VPS / JPS / Railway…).
 * Les URLs côté navigateur passent par le frontend (environment.ts / env de build).
 */
export function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function envStr(name, fallback) {
  const raw = process.env[name];
  return raw == null || raw === '' ? fallback : raw;
}

/** Origines CORS autorisées (SSE API + éventuel reverse-proxy). */
export function corsOrigins() {
  const raw = envStr('CORS_ORIGINS', '*');
  if (raw.trim() === '*') return true;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}
