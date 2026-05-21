import {
  getIntervalMs,
  getMessagesPerSecond,
  setIntervalMs,
} from './config-store.js';

export function getIntervalConfig(_req, res) {
  res.json({
    intervalMs: getIntervalMs(),
    messagesPerSecond: getMessagesPerSecond(),
  });
}

export function postIntervalConfig(req, res) {
  const ms = setIntervalMs(req.body?.intervalMs);
  res.json({
    intervalMs: ms,
    messagesPerSecond: getMessagesPerSecond(),
  });
}
