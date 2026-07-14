#!/usr/bin/env node
/**
 * Remplace les placeholders __WS_URL__ / __SSE_URL__ / __WT_URL__
 * dans environment.prod.ts avant le build Vercel / CI.
 *
 * Variables Vercel attendues (Project Settings → Environment Variables) :
 *   WS_URL   ex. wss://ws.mondomaine.com
 *   SSE_URL  ex. https://api.mondomaine.com
 *   WT_URL   ex. https://wt.mondomaine.com:3003
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'src/environments/environment.prod.ts');

const ws = process.env.WS_URL || 'ws://localhost:3001';
const sse = process.env.SSE_URL || 'http://localhost:3002';
const wt = process.env.WT_URL || 'https://127.0.0.1:3003';

let src = readFileSync(file, 'utf8');
src = src
  .replaceAll('__WS_URL__', ws.replaceAll("'", "\\'"))
  .replaceAll('__SSE_URL__', sse.replaceAll("'", "\\'"))
  .replaceAll('__WT_URL__', wt.replaceAll("'", "\\'"));
writeFileSync(file, src);
console.log('environment.prod.ts injecté :', { ws, sse, wt });
