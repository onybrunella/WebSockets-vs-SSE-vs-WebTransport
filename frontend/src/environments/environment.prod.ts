/** Remplacé au build production (Vercel / Docker). Les URLs viennent des variables d'environnement de build. */
export const environment = {
  production: true,
  wsUrl: '__WS_URL__',
  sseUrl: '__SSE_URL__',
  wtUrl: '__WT_URL__',
};
