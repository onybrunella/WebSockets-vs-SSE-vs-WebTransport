import { Http2Server } from '@fails-components/webtransport';
import { readFileSync } from 'fs';
import { networkInterfaces } from 'os';
import { execSync } from 'child_process';
import { buildMessage, startPushLoop } from './lib/push-loop.js';

const PORT = 3003;

function getCertSpkiHashBase64() {
    try {
        const pub = execSync('openssl x509 -in cert.pem -pubkey -noout');
        const der = execSync('openssl pkey -pubin -outform der', { input: pub });
        return execSync('openssl dgst -sha256 -binary | base64', { input: der }).toString().trim();
    } catch {
        return '(openssl indisponible)';
    }
}

function getLanIps() {
    const ips = new Set(['127.0.0.1']);
    for (const ifaces of Object.values(networkInterfaces())) {
        for (const iface of ifaces ?? []) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.add(iface.address);
            }
        }
    }
    return [...ips];
}

const server = new Http2Server({
    port: PORT,
    host: '0.0.0.0',
    secret: 'mysecret',
    cert: readFileSync('./cert.pem', 'utf8'),
    privKey: readFileSync('./key.pem', 'utf8'),
});

const sessionStream = server.sessionStream('/webtransport');
server.startServer();

async function handleSession(session) {
    console.log('Client connecté via WebTransport (HTTP/2 + WebSocket)');

    try {
        await session.ready;

        // WebSocket : pas de flux unidirectionnels serveur → utiliser datagrams
        const writer = session.datagrams.writable.getWriter();
        const encoder = new TextEncoder();

        const stop = startPushLoop(async () => {
            const message = buildMessage('webtransport');
            await writer.write(encoder.encode(JSON.stringify(message)));
        });

        session.closed.then(() => {
            console.log('Client déconnecté');
            stop();
            writer.close().catch(() => {});
        });
    } catch (err) {
        console.error('Erreur session WebTransport:', err);
        try {
            session.close();
        } catch {
            /* ignore */
        }
    }
}

(async () => {
    await server.ready;
    console.log(`WebTransport (TLS TCP / HTTP2) sur le port ${PORT}`);
    console.log(`  Hash SPKI (wt-config.ts): ${getCertSpkiHashBase64()}`);
    console.log('  Transport : wss + datagrams (pas de flux uni serveur en WebSocket)');
    for (const ip of getLanIps()) {
        console.log(`  → wss://${ip}:${PORT}/webtransport`);
    }

    const sessionReader = sessionStream.getReader();
    while (true) {
        const { done, value } = await sessionReader.read();
        if (done) break;
        handleSession(value);
    }
})();
