import { Http2Server } from '@fails-components/webtransport';
import { readFileSync } from 'fs';
import { networkInterfaces } from 'os';
import { execSync } from 'child_process';
import { buildMessage, startPushLoop } from './lib/push-loop.js';

const PORT = 3003;

function certHash() {
  try {
    const pub = execSync('openssl x509 -in cert.pem -pubkey -noout');
    const der = execSync('openssl pkey -pubin -outform der', { input: pub });
    return execSync('openssl dgst -sha256 -binary | base64', { input: der }).toString().trim();
  } catch {
    return '(openssl indisponible)';
  }
}

function lanIps() {
  const ips = new Set(['127.0.0.1']);
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const i of ifaces ?? []) {
      if (i.family === 'IPv4' && !i.internal) ips.add(i.address);
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

const sessions = server.sessionStream('/webtransport');
server.startServer();

async function onSession(session) {
  console.log('Client connecté via WebTransport');
  try {
    await session.ready;
    const writer = session.datagrams.writable.getWriter();
    const enc = new TextEncoder();

    const stop = startPushLoop(async () => {
      await writer.write(enc.encode(JSON.stringify(buildMessage('webtransport'))));
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
  console.log(`WebTransport sur le port ${PORT}`);
  console.log(`  Hash SPKI (wt-config.ts) : ${certHash()}`);
  for (const ip of lanIps()) console.log(`  → wss://${ip}:${PORT}/webtransport`);

  const reader = sessions.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onSession(value);
  }
})();
