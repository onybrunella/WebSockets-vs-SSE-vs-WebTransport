import { WebSocketServer } from 'ws';
import { buildMessage, startPushLoop } from './lib/push-loop.js';

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server running on ws://localhost:${PORT}`);

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
