import { WebSocketServer } from 'ws';
import { buildMessage, startPushLoop } from './lib/push-loop.js';
import { envInt, envStr } from './lib/env.js';

const PORT = envInt('WS_PORT', envInt('PORT', 3001));
const HOST = envStr('HOST', '0.0.0.0');

const wss = new WebSocketServer({ port: PORT, host: HOST });

console.log(`WebSocket server running on ws://${HOST}:${PORT}`);

wss.on('connection', (ws) => {
  console.log('Client connecté via WebSocket');

  const stop = startPushLoop(() => {
    ws.send(JSON.stringify(buildMessage('websocket')));
  });

  ws.on('close', () => {
    console.log('Client déconnecté');
    stop();
  });
});
