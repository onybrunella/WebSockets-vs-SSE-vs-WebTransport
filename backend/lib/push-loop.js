import { getIntervalMs } from './config-store.js';

export function buildMessage(protocol) {
  return {
    protocol,
    timestamp: Date.now(),
    value: Math.random() * 100,
  };
}

/** Boucle d'envoi ; l'intervalle suit config-store (partagé entre les 3 serveurs). */
export function startPushLoop(send) {
  let stopped = false;
  let timer = null;

  const tick = async () => {
    if (stopped) return;
    try {
      await send();
    } catch {
      /* connexion fermée */
    }
    if (!stopped) {
      timer = setTimeout(tick, getIntervalMs());
    }
  };

  void tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
