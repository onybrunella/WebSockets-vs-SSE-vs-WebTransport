import { SSE_PORT, WS_PORT, WT_PORT, WT_SETUP_HOST } from './wt-config';

/** Variables injectées en prod (Vercel / Docker) via public/env.js → window.__ENV__ */
type RuntimeEnv = {
  WS_URL?: string;
  SSE_URL?: string;
  WT_URL?: string;
};

function runtimeEnv(): RuntimeEnv {
  return (window as unknown as { __ENV__?: RuntimeEnv }).__ENV__ ?? {};
}

function pageHost(): string {
  return window.location.hostname || WT_SETUP_HOST;
}

/** URL WebSocket complète (ex. ws://localhost:3001 ou wss://api.example.com). */
export function wsUrl(): string {
  const override = runtimeEnv().WS_URL?.trim();
  if (override) return override;
  return `ws://${pageHost()}:${WS_PORT}`;
}

/** Base HTTP du serveur SSE (sans chemin). */
export function sseBaseUrl(): string {
  const override = runtimeEnv().SSE_URL?.trim();
  if (override) return override.replace(/\/$/, '');
  return `http://${pageHost()}:${SSE_PORT}`;
}

export function sseApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${sseBaseUrl()}${p}`;
}

/** URL session WebTransport (…/webtransport). */
export function wtSessionUrl(): string {
  const override = runtimeEnv().WT_URL?.trim();
  if (override) {
    return override.includes('/webtransport')
      ? override
      : `${override.replace(/\/$/, '')}/webtransport`;
  }
  return `https://${pageHost()}:${WT_PORT}/webtransport`;
}
