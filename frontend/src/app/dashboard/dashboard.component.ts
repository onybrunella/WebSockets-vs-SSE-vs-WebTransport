import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WT_HASH_BASE64, WT_SETUP_HOST } from '../wt-config';
import {
  ApiConfigService,
  Measurement,
  ProtocolId,
  ProtocolStats,
  PushMessage,
} from '../services/api-config.service';

type TabId = 'live' | 'exp1' | 'exp2' | 'exp3';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly api = inject(ApiConfigService);

  tab: TabId = 'live';
  intervalMs = 1000;
  paused = false;
  autoReconnect = true;
  messagesPerSecond = 1;

  readonly protocols: ProtocolId[] = ['websocket', 'sse', 'webtransport'];
  stats: Record<ProtocolId, ProtocolStats> = {
    websocket: this.emptyStats(),
    sse: this.emptyStats(),
    webtransport: this.emptyStats(),
  };

  measurements: Measurement[] = [];
  exp3Log: { t: number; event: string }[] = [];
  exportStatus = '';
  wtError = '';
  wtSetupHost = WT_SETUP_HOST;

  get wtHostWithPort(): string {
    return `${this.wtSetupHost}:4200`;
  }

  private ws: WebSocket | null = null;
  private es: EventSource | null = null;
  private wt: WebTransport | null = null;
  private wtAbort: AbortController | null = null;
  private wsRetry: ReturnType<typeof setTimeout> | null = null;
  private wtRetry: ReturnType<typeof setTimeout> | null = null;
  private stallTimer: ReturnType<typeof setInterval> | null = null;
  private lastMsgAt: Record<ProtocolId, number> = {
    websocket: 0,
    sse: 0,
    webtransport: 0,
  };
  private sums: Record<ProtocolId, number> = {
    websocket: 0,
    sse: 0,
    webtransport: 0,
  };

  ngOnInit(): void {
    void this.refreshConfig();
    this.connectAll();
    this.stallTimer = setInterval(() => this.checkMessageStalls(), 2000);
  }

  ngOnDestroy(): void {
    this.disconnectAll();
    if (this.stallTimer) clearInterval(this.stallTimer);
  }

  get sseEventsUrl(): string {
    return `${this.api.sseBase}/events`;
  }

  setTab(tab: TabId): void {
    this.tab = tab;
  }

  async refreshConfig(): Promise<void> {
    try {
      const res = await fetch(`${this.api.sseBase}/api/config/interval`);
      if (!res.ok) return;
      const data = await res.json();
      this.intervalMs = data.intervalMs ?? this.intervalMs;
      this.paused = !!data.paused;
      this.messagesPerSecond = data.messagesPerSecond ?? this.messagesPerSecond;
    } catch {
      /* backend pas encore démarré */
    }
  }

  async applyInterval(): Promise<void> {
    await this.postConfig({ intervalMs: this.intervalMs });
  }

  async setRate(msgPerSec: number): Promise<void> {
    this.messagesPerSecond = msgPerSec;
    this.intervalMs = Math.max(10, Math.round(1000 / msgPerSec));
    await this.applyInterval();
  }

  async togglePause(): Promise<void> {
    await this.postConfig({ paused: !this.paused });
  }

  connectAll(): void {
    this.connectWebSocket();
    this.connectSSE();
    void this.connectWebTransport();
  }

  disconnectAll(): void {
    this.clearRetries();
    this.closeWebSocket();
    this.closeSSE();
    this.closeWebTransport();
  }

  reconnect(protocol: ProtocolId): void {
    if (protocol === 'websocket') {
      this.closeWebSocket();
      this.connectWebSocket();
    } else if (protocol === 'sse') {
      this.closeSSE();
      this.connectSSE();
    } else {
      this.closeWebTransport();
      void this.connectWebTransport();
    }
  }

  prepareExp1(): void {
    this.resetMeasurements();
    void this.setRate(1);
    this.logExp3('Préparer Exp.1 — 1 msg/s, mesures vidées');
  }

  async runExp2Ladder(): Promise<void> {
    this.resetMeasurements();
    this.logExp3('Exp.2 — démarrage paliers 1/10/50/100');
    for (const rate of [1, 10, 50, 100]) {
      await this.setRate(rate);
      this.logExp3(`Exp.2 — palier ${rate} msg/s (mesurez ~1 min puis passez au suivant)`);
    }
  }

  prepareExp3(): void {
    this.exp3Log = [];
    this.resetMeasurements();
    void this.setRate(1);
    this.autoReconnect = true;
    this.logExp3('Préparer Exp.3 — journal vidé, 1 msg/s, reconnexion auto ON');
  }

  markCut(): void {
    this.logExp3('Marquer coupure — lancer sudo ./utils/simulate-network-cut.sh 5 côté backend');
  }

  async exportCsv(prefix = 'mesures'): Promise<void> {
    if (this.measurements.length === 0) {
      this.exportStatus = 'Aucune mesure à exporter';
      return;
    }
    try {
      const res = await fetch(`${this.api.sseBase}/api/export/csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measurements: this.measurements, prefix }),
      });
      const data = await res.json();
      this.exportStatus = res.ok
        ? `CSV enregistré : ${data.filename} (${data.count} lignes)`
        : `Erreur export : ${data.error ?? res.status}`;
    } catch (err) {
      this.exportStatus = `Échec export : ${err}`;
    }
  }

  exportExp3Journal(): void {
    const blob = new Blob(
      [this.exp3Log.map((e) => `${e.t},${JSON.stringify(e.event)}`).join('\n')],
      { type: 'text/csv' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `exp3_log_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.exportStatus = 'Journal Exp.3 téléchargé';
  }

  label(p: ProtocolId): string {
    return p === 'websocket' ? 'WebSocket' : p === 'sse' ? 'SSE' : 'WebTransport';
  }

  // --- WebSocket -----------------------------------------------------------

  private connectWebSocket(): void {
    this.closeWebSocket();
    this.stats.websocket.status = 'connexion…';
    try {
      this.ws = new WebSocket(this.api.wsUrl);
    } catch (err) {
      this.stats.websocket.status = `erreur : ${err}`;
      this.scheduleWsReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.stats.websocket.connected = true;
      this.stats.websocket.status = 'connecté';
      this.logExp3('WS open');
    };
    this.ws.onmessage = (ev) => this.onPush(JSON.parse(ev.data as string));
    this.ws.onerror = () => {
      this.stats.websocket.status = 'erreur';
    };
    this.ws.onclose = () => {
      this.stats.websocket.connected = false;
      this.stats.websocket.status = 'fermé';
      this.logExp3('WS close');
      this.scheduleWsReconnect();
    };
  }

  private closeWebSocket(): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.stats.websocket.connected = false;
  }

  private scheduleWsReconnect(): void {
    if (!this.autoReconnect) return;
    if (this.wsRetry) clearTimeout(this.wsRetry);
    this.wsRetry = setTimeout(() => this.connectWebSocket(), 1000);
  }

  forceWsStaleReconnect(): void {
    this.logExp3('WS stale reconnect');
    this.closeWebSocket();
    this.connectWebSocket();
  }

  // --- SSE -----------------------------------------------------------------

  private connectSSE(): void {
    this.closeSSE();
    this.stats.sse.status = 'connexion…';
    try {
      this.es = new EventSource(this.sseEventsUrl);
    } catch (err) {
      this.stats.sse.status = `erreur : ${err}`;
      return;
    }
    this.es.onopen = () => {
      this.stats.sse.connected = true;
      this.stats.sse.status = 'connecté';
      this.logExp3('SSE open');
    };
    this.es.onmessage = (ev) => this.onPush(JSON.parse(ev.data));
    this.es.onerror = () => {
      this.stats.sse.connected = this.es?.readyState === EventSource.OPEN;
      this.stats.sse.status =
        this.es?.readyState === EventSource.CONNECTING ? 'reconnexion…' : 'erreur';
      this.logExp3('SSE error/reconnect');
    };
  }

  private closeSSE(): void {
    if (this.es) {
      this.es.close();
      this.es = null;
    }
    this.stats.sse.connected = false;
  }

  scheduleSseReconnect(): void {
    this.closeSSE();
    this.connectSSE();
  }

  // --- WebTransport --------------------------------------------------------

  private async connectWebTransport(): Promise<void> {
    this.closeWebTransport();
    this.wtError = '';
    this.stats.webtransport.status = 'connexion…';

    if (typeof WebTransport === 'undefined') {
      this.wtError = 'WebTransport non supporté (utilisez Chrome ou Edge)';
      this.stats.webtransport.status = 'non supporté';
      return;
    }

    const url = `${this.api.wtBase}/webtransport`;
    const options: WebTransportOptions = {};
    if (WT_HASH_BASE64) {
      try {
        options.serverCertificateHashes = [
          {
            algorithm: 'sha-256',
            value: Uint8Array.from(atob(WT_HASH_BASE64), (c) => c.charCodeAt(0)).buffer,
          },
        ];
      } catch {
        this.wtError = 'Hash certificat WT invalide — relancer npm run setup:wt';
      }
    }

    this.wtAbort = new AbortController();
    try {
      this.wt = new WebTransport(url, options);
      await this.wt.ready;
      this.stats.webtransport.connected = true;
      this.stats.webtransport.status = 'connecté';
      this.logExp3('WT open');
      void this.readWtDatagrams(this.wt);
      this.wt.closed
        .then(() => {
          this.stats.webtransport.connected = false;
          this.stats.webtransport.status = 'fermé';
          this.logExp3('WT close');
          this.scheduleWtReconnect();
        })
        .catch((err) => {
          this.wtError = String(err);
          this.stats.webtransport.connected = false;
          this.stats.webtransport.status = 'erreur';
          this.scheduleWtReconnect();
        });
    } catch (err) {
      this.wtError = String(err);
      this.stats.webtransport.status = 'échec handshake';
      this.logExp3(`WT error: ${err}`);
      this.scheduleWtReconnect();
    }
  }

  private async readWtDatagrams(session: WebTransport): Promise<void> {
    const reader = session.datagrams.readable.getReader();
    const dec = new TextDecoder();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        const msg = JSON.parse(dec.decode(value)) as PushMessage;
        this.onPush(msg);
      }
    } catch {
      /* session fermée */
    }
  }

  private closeWebTransport(): void {
    this.wtAbort?.abort();
    this.wtAbort = null;
    try {
      this.wt?.close();
    } catch {
      /* ignore */
    }
    this.wt = null;
    this.stats.webtransport.connected = false;
  }

  private scheduleWtReconnect(): void {
    if (!this.autoReconnect) return;
    if (this.wtRetry) clearTimeout(this.wtRetry);
    this.wtRetry = setTimeout(() => void this.connectWebTransport(), 1000);
  }

  // --- commun --------------------------------------------------------------

  private onPush(msg: PushMessage): void {
    const protocol = msg.protocol;
    const latency = Math.max(0, Date.now() - msg.timestamp);
    const m: Measurement = {
      protocol,
      latency,
      value: msg.value,
      timestamp: msg.timestamp,
    };
    this.measurements.push(m);
    if (this.measurements.length > 50_000) {
      this.measurements.splice(0, this.measurements.length - 50_000);
    }

    const s = this.stats[protocol];
    s.count += 1;
    s.lastLatency = latency;
    s.lastValue = msg.value;
    this.sums[protocol] += latency;
    s.avgLatency = this.sums[protocol] / s.count;
    this.lastMsgAt[protocol] = Date.now();
  }

  private checkMessageStalls(): void {
    if (this.paused || !this.autoReconnect) return;
    const now = Date.now();
    const threshold = Math.max(3000, this.intervalMs * 3);
    for (const p of this.protocols) {
      if (!this.stats[p].connected) continue;
      if (this.lastMsgAt[p] && now - this.lastMsgAt[p] > threshold) {
        this.logExp3(`stall détecté ${p} — reconnexion`);
        if (p === 'websocket') this.forceWsStaleReconnect();
        else if (p === 'sse') this.scheduleSseReconnect();
        else {
          this.closeWebTransport();
          void this.connectWebTransport();
        }
      }
    }
  }

  private async postConfig(body: { intervalMs?: number; paused?: boolean }): Promise<void> {
    try {
      const res = await fetch(`${this.api.sseBase}/api/config/interval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      this.intervalMs = data.intervalMs ?? this.intervalMs;
      this.paused = !!data.paused;
      this.messagesPerSecond = data.messagesPerSecond ?? this.messagesPerSecond;
    } catch (err) {
      this.exportStatus = `Config inaccessible : ${err}`;
    }
  }

  private resetMeasurements(): void {
    this.measurements = [];
    for (const p of this.protocols) {
      this.stats[p] = { ...this.emptyStats(), connected: this.stats[p].connected, status: this.stats[p].status };
      this.sums[p] = 0;
    }
  }

  private logExp3(event: string): void {
    this.exp3Log.push({ t: Date.now(), event });
    if (this.exp3Log.length > 2000) this.exp3Log.shift();
  }

  private clearRetries(): void {
    if (this.wsRetry) clearTimeout(this.wsRetry);
    if (this.wtRetry) clearTimeout(this.wtRetry);
    this.wsRetry = null;
    this.wtRetry = null;
  }

  private emptyStats(): ProtocolStats {
    return {
      connected: false,
      count: 0,
      lastLatency: null,
      avgLatency: null,
      lastValue: null,
      status: 'idle',
    };
  }
}
