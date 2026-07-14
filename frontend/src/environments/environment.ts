/** URLs des backends — surchargées en prod via fileReplacements / build args. */
export const environment = {
  production: false,
  wsUrl: 'ws://localhost:3001',
  sseUrl: 'http://localhost:3002',
  /** Base HTTP(S) du serveur WebTransport (sans /webtransport). */
  wtUrl: 'https://127.0.0.1:3003',
};
