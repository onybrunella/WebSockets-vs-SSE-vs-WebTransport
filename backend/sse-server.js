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

// SSE + routes config/export (un seul serveur pour éviter de dupliquer l'API)
const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

function configPayload() {
  return {
    intervalMs: getIntervalMs(),
    messagesPerSecond: getMessagesPerSecond(),
    paused: getPaused(),
  };
}

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

  const stop = startPushLoop(() => {
    res.write(`data: ${JSON.stringify(buildMessage('sse'))}\n\n`);
  });

  req.on('close', () => {
    console.log('Client déconnecté');
    stop();
  });
});

app.listen(PORT, () => {
  console.log(`SSE server running on http://localhost:${PORT}`);
});
