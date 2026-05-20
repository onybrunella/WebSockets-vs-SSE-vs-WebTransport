import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3002;

app.use(cors());

app.get('/events', (req, res) => {
    console.log('Client connecté via SSE');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const interval = setInterval(() => {
        const message = {
            protocol: 'sse',
            timestamp: Date.now(),
            value: Math.random() * 100
        };
        res.write(`data: ${JSON.stringify(message)}\n\n`);
    }, 1000);

    req.on('close', () => {
        console.log('Client déconnecté');
        clearInterval(interval);
    });
});

app.listen(PORT, () => {
    console.log(`SSE server running on http://localhost:${PORT}`);
});