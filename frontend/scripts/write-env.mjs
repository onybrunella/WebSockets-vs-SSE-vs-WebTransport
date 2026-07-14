#!/usr/bin/env node
/**
 * Écrit public/env.js pour le build Vercel / CI.
 * Variables : WS_URL, SSE_URL, WT_URL
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public/env.js');

const ws = process.env.WS_URL || '';
const sse = process.env.SSE_URL || '';
const wt = process.env.WT_URL || '';

const body = `window.__ENV__ = {
  WS_URL: ${JSON.stringify(ws)},
  SSE_URL: ${JSON.stringify(sse)},
  WT_URL: ${JSON.stringify(wt)}
};
`;
writeFileSync(out, body);
console.log('public/env.js écrit', { ws, sse, wt });
