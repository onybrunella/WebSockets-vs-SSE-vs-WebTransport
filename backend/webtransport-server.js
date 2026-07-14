import { Http2Server } from '@fails-components/webtransport';
import { existsSync, readFileSync } from 'fs';
import { networkInterfaces } from 'os';
import { execSync } from 'child_process';
import { buildMessage, startPushLoop } from './lib/push-loop.js';
import { envInt, envStr } from './lib/env.js';

const PORT = envInt('WT_PORT', envInt('PORT', 3003));
const HOST = envStr('HOST', '0.0.0.0');
const CERT_PATH = envStr('WT_CERT', './cert.pem');
const KEY_PATH = envStr('WT_KEY', './key.pem');

function certHash() {
  try {
    const pub = execSync(`openssl x509 -in ${CERT_PATH} -pubkey -noout`);
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

if (!existsSync(CERT_PATH) || !existsSync(KEY_PATH)) {
  console.error(
    `Certificat WebTransport manquant (${CERT_PATH} / ${KEY_PATH}).\n` +
      '  → local : cd backend && npm run setup:wt\n' +
      '  → Docker : le conteneur génère le certificat au démarrage',
  );
  process.exit(1);
}

const server = new Http2Server({
  port: PORT,
  host: HOST,
  secret: envStr('WT_SECRET', 'mysecret'),
  cert: readFileSync(CERT_PATH, 'utf8'),
  privKey: readFileSync(KEY_PATH, 'utf8'),
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
  console.log(`WebTransport sur ${HOST}:${PORT}`);
  console.log(`  Hash SPKI (wt-config.ts) : ${certHash()}`);
  for (const ip of lanIps()) console.log(`  → https://${ip}:${PORT}/webtransport`);

  const reader = sessions.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onSession(value);
  }
})();
