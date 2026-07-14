import { Injectable } from '@angular/core';

// Mesures latence / débit, 3 listes (une par protocole) pour l'export CSV
@Injectable({ providedIn: 'root' })
export class MetricsService {
  private wsMeasurements: { protocol: string; latency: number; timestamp: number; value: number }[] =
    [];
  private sseMeasurements: { protocol: string; latency: number; timestamp: number; value: number }[] =
    [];
  private wtMeasurements: { protocol: string; latency: number; timestamp: number; value: number }[] =
    [];

  // débit WebSocket
  private wsMsgCount = 0;
  private wsThroughput = 0;
  private wsThroughputTimer?: ReturnType<typeof setInterval>;

  // débit SSE
  private sseMsgCount = 0;
  private sseThroughput = 0;
  private sseThroughputTimer?: ReturnType<typeof setInterval>;

  // débit WebTransport
  private wtMsgCount = 0;
  private wtThroughput = 0;
  private wtThroughputTimer?: ReturnType<typeof setInterval>;

  addWebSocketMeasurement(timestamp: number, value: number, receivedAt: number): void {
    this.wsMeasurements.push({
      protocol: 'websocket',
      latency: receivedAt - timestamp,
      timestamp: timestamp,
      value: value,
    });
    this.wsMsgCount++;
  }

  addSseMeasurement(timestamp: number, value: number, receivedAt: number): void {
    this.sseMeasurements.push({
      protocol: 'sse',
      latency: receivedAt - timestamp,
      timestamp: timestamp,
      value: value,
    });
    this.sseMsgCount++;
  }

  addWebTransportMeasurement(timestamp: number, value: number, receivedAt: number): void {
    this.wtMeasurements.push({
      protocol: 'webtransport',
      latency: receivedAt - timestamp,
      timestamp: timestamp,
      value: value,
    });
    this.wtMsgCount++;
  }

  startWebSocketThroughput(): void {
    this.wsMsgCount = 0;
    this.wsThroughput = 0;
    clearInterval(this.wsThroughputTimer);
    this.wsThroughputTimer = setInterval(() => {
      this.wsThroughput = this.wsMsgCount;
      this.wsMsgCount = 0;
    }, 1000);
  }

  stopWebSocketThroughput(): void {
    clearInterval(this.wsThroughputTimer);
    this.wsMsgCount = 0;
    this.wsThroughput = 0;
  }

  startSseThroughput(): void {
    this.sseMsgCount = 0;
    this.sseThroughput = 0;
    clearInterval(this.sseThroughputTimer);
    this.sseThroughputTimer = setInterval(() => {
      this.sseThroughput = this.sseMsgCount;
      this.sseMsgCount = 0;
    }, 1000);
  }

  stopSseThroughput(): void {
    clearInterval(this.sseThroughputTimer);
    this.sseMsgCount = 0;
    this.sseThroughput = 0;
  }

  startWebTransportThroughput(): void {
    this.wtMsgCount = 0;
    this.wtThroughput = 0;
    clearInterval(this.wtThroughputTimer);
    this.wtThroughputTimer = setInterval(() => {
      this.wtThroughput = this.wtMsgCount;
      this.wtMsgCount = 0;
    }, 1000);
  }

  stopWebTransportThroughput(): void {
    clearInterval(this.wtThroughputTimer);
    this.wtMsgCount = 0;
    this.wtThroughput = 0;
  }

  getWebSocketThroughput(): number {
    return this.wsThroughput;
  }

  getSseThroughput(): number {
    return this.sseThroughput;
  }

  getWebTransportThroughput(): number {
    return this.wtThroughput;
  }

  getAllMeasurements() {
    return [...this.wsMeasurements, ...this.sseMeasurements, ...this.wtMeasurements];
  }

  getWebSocketAverageLatency(): number {
    if (this.wsMeasurements.length === 0) return 0;
    let sum = 0;
    for (const m of this.wsMeasurements) {
      sum += m.latency;
    }
    return Math.round(sum / this.wsMeasurements.length);
  }

  getSseAverageLatency(): number {
    if (this.sseMeasurements.length === 0) return 0;
    let sum = 0;
    for (const m of this.sseMeasurements) {
      sum += m.latency;
    }
    return Math.round(sum / this.sseMeasurements.length);
  }

  getWebTransportAverageLatency(): number {
    if (this.wtMeasurements.length === 0) return 0;
    let sum = 0;
    for (const m of this.wtMeasurements) {
      sum += m.latency;
    }
    return Math.round(sum / this.wtMeasurements.length);
  }

  getWebSocketMinLatency(): number {
    if (this.wsMeasurements.length === 0) return 0;
    let min = this.wsMeasurements[0].latency;
    for (const m of this.wsMeasurements) {
      if (m.latency < min) min = m.latency;
    }
    return min;
  }

  getSseMinLatency(): number {
    if (this.sseMeasurements.length === 0) return 0;
    let min = this.sseMeasurements[0].latency;
    for (const m of this.sseMeasurements) {
      if (m.latency < min) min = m.latency;
    }
    return min;
  }

  getWebTransportMinLatency(): number {
    if (this.wtMeasurements.length === 0) return 0;
    let min = this.wtMeasurements[0].latency;
    for (const m of this.wtMeasurements) {
      if (m.latency < min) min = m.latency;
    }
    return min;
  }

  getWebSocketMaxLatency(): number {
    if (this.wsMeasurements.length === 0) return 0;
    let max = this.wsMeasurements[0].latency;
    for (const m of this.wsMeasurements) {
      if (m.latency > max) max = m.latency;
    }
    return max;
  }

  getSseMaxLatency(): number {
    if (this.sseMeasurements.length === 0) return 0;
    let max = this.sseMeasurements[0].latency;
    for (const m of this.sseMeasurements) {
      if (m.latency > max) max = m.latency;
    }
    return max;
  }

  getWebTransportMaxLatency(): number {
    if (this.wtMeasurements.length === 0) return 0;
    let max = this.wtMeasurements[0].latency;
    for (const m of this.wtMeasurements) {
      if (m.latency > max) max = m.latency;
    }
    return max;
  }

  getWebSocketLastLatencies(): number[] {
    return this.wsMeasurements.slice(-30).map((m) => m.latency);
  }

  getSseLastLatencies(): number[] {
    return this.sseMeasurements.slice(-30).map((m) => m.latency);
  }

  getWebTransportLastLatencies(): number[] {
    return this.wtMeasurements.slice(-30).map((m) => m.latency);
  }

  clearAll(): void {
    this.wsMeasurements = [];
    this.sseMeasurements = [];
    this.wtMeasurements = [];
  }
}
