import express from 'express';
import cors from 'cors';
import { handleCsvExport } from './lib/csv-export.js';
import {
  getIntervalMs,
  getMessagesPerSecond,
  getPaused,
  setIntervalMs,
  setPaused,
} from './lib/config-store.js';
import { buildMessage, startPushLoop } from './lib/push-loop.js';
import { corsOrigins, envInt, envStr } from './lib/env.js';

const app = express();
const PORT = envInt('SSE_PORT', envInt('PORT', 3002));
const HOST = envStr('HOST', '0.0.0.0');

app.use(cors({ origin: corsOrigins() }));
app.use(express.json({ limit: '10mb' }));

function configPayload() {
  return {
    intervalMs: getIntervalMs(),
    messagesPerSecond: getMessagesPerSecond(),
    paused: getPaused(),
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'sse' });
});

app.get('/api/config/interval', (_req, res) => {
  res.json(configPayload());
});

app.post('/api/config/interval', (req, res) => {
  if (typeof req.body?.paused === 'boolean') {
    setPaused(req.body.paused);
  }
  if (req.body?.intervalMs != null) {
    setIntervalMs(req.body.intervalMs);
  }
  res.json(configPayload());
});

app.post('/api/export/csv', handleCsvExport);

app.get('/events', (req, res) => {
  console.log('Client connecté via SSE');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const stop = startPushLoop(() => {
    res.write(`data: ${JSON.stringify(buildMessage('sse'))}\n\n`);
  });

  req.on('close', () => {
    console.log('Client déconnecté');
    stop();
  });
});

app.listen(PORT, HOST, () => {
  console.log(`SSE server running on http://${HOST}:${PORT}`);
});
