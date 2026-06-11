import { getIntervalMs, getPaused } from './config-store.js';

export function buildMessage(protocol) {
  return {
    protocol,
    timestamp: Date.now(),
    value: Math.random() * 100,
  };
}

// Boucle d'envoi — lit l'intervalle dans config-store (partagé entre les 3 serveurs)
export function startPushLoop(send) {
  let stopped = false;
  let timer = null;

  const tick = async () => {
    if (stopped) return;
    if (!getPaused()) {
      try {
        await send();
      } catch {
        /* connexion fermée */
      }
    }
    if (!stopped) {
      timer = setTimeout(tick, getPaused() ? 250 : getIntervalMs());
    }
  };

  void tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
