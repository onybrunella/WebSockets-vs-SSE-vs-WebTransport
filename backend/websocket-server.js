import { WebSocketServer } from 'ws';

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
    console.log('Client connecté via WebSocket');

    const interval = setInterval(() => {
        const message = {
            protocol: 'websocket',
            timestamp: Date.now(),
            value: Math.random() * 100
        };
        ws.send(JSON.stringify(message));
    }, 1000);

    ws.on('close', () => {
        console.log('Client déconnecté');
        clearInterval(interval);
    });
});