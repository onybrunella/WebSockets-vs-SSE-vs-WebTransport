import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricsService } from '../services/metrics.service';
import { WebTransportPonyfill as WebTransportClient } from '@fails-components/webtransport/browser';
import { SSE_PORT, WS_PORT, WT_HASH_BASE64, WT_PORT, WT_SETUP_HOST } from '../wt-config';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Chronomètre
  timerSeconds = 120;
  timerRemaining = 120;
  timerText = '2:00';
  timerRunning = false;
  timerDone = false;
  timerMessage = '';

  // Config serveur / export
  exportMessage: string | null = null;
  configMessage = '';
  serverIntervalMs = 1000;
  serversPaused = false;
  showPauseBanner = false;
  exportPrefix = 'mesures';

  // WebSocket
  wsConnected = false;
  wsPhase: 'off' | 'on' | 'reconnecting' | 'reconnected' = 'off';
  wsLastValue = 0;
  wsAvgLatency = 0;
  wsMinLatency = 0;
  wsMaxLatency = 0;
  wsThroughput = 0;
  wsLatencies: number[] = [];
  wsChartMax = 1;

  // SSE
  sseConnected = false;
  ssePhase: 'off' | 'on' | 'reconnecting' | 'reconnected' = 'off';
  sseLastValue = 0;
  sseAvgLatency = 0;
  sseMinLatency = 0;
  sseMaxLatency = 0;
  sseThroughput = 0;
  sseLatencies: number[] = [];
  sseChartMax = 1;

  // WebTransport
  wtConnected = false;
  wtPhase: 'off' | 'on' | 'reconnecting' | 'reconnected' = 'off';
  wtError: string | null = null;
  wtLastValue = 0;
  wtAvgLatency = 0;
  wtMinLatency = 0;
  wtMaxLatency = 0;
  wtThroughput = 0;
  wtLatencies: number[] = [];
  wtChartMax = 1;

  activeExp = 1;
  expPrepared = 0; // 1, 2 ou 3 quand Préparer / palier a réussi

  // Expérience 3
  autoReconnect = true;
  exp3CutMarked = false;
  exp3Message = '';
  lastReconnectWs: number | null = null;
  lastReconnectSse: number | null = null;
  lastReconnectWt: number | null = null;

  private wsSocket: WebSocket | null = null;
  private sseSource: EventSource | null = null;
  private wtTransport: any = null;

  private wsManualOff = false;
  private sseManualOff = false;
  private wtManualOff = false;

  private wsDisconnectAt: number | null = null;
  private sseDisconnectAt: number | null = null;
  private wtDisconnectAt: number | null = null;

  private wsReconnectTimer?: ReturnType<typeof setTimeout>;
  private sseReconnectTimer?: ReturnType<typeof setTimeout>;
  private wtReconnectTimer?: ReturnType<typeof setTimeout>;

  private lastMsgWs = 0;
  private lastMsgSse = 0;
  private lastMsgWt = 0;

  private exp3Events: {
    protocol: string;
    event: string;
    timestamp: number;
    reconnectionMs?: number;
  }[] = [];

  private throughputTimer?: ReturnType<typeof setInterval>;
  private countdownTimer?: ReturnType<typeof setInterval>;

  constructor(
    private metrics: MetricsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // refresh débit + graphiques (sans zone.js)
    this.throughputTimer = setInterval(() => {
      if (this.wsConnected) {
        this.wsThroughput = this.metrics.getWebSocketThroughput();
      }
      if (this.sseConnected) {
        this.sseThroughput = this.metrics.getSseThroughput();
      }
      if (this.wtConnected) {
        this.wtThroughput = this.metrics.getWebTransportThroughput();
      }
      this.checkMessageStalls();
      this.cdr.markForCheck();
    }, 1000);

    this.fetchServerInterval();
  }

  ngOnDestroy(): void {
    clearInterval(this.throughputTimer);
    clearInterval(this.countdownTimer);
    this.timerRunning = false;
    this.disconnectAll();
    clearTimeout(this.wsReconnectTimer);
    clearTimeout(this.sseReconnectTimer);
    clearTimeout(this.wtReconnectTimer);
  }

  setTimer(seconds: number): void {
    clearInterval(this.countdownTimer);
    this.timerRunning = false;
    this.timerSeconds = seconds;
    this.timerRemaining = seconds;
    this.timerDone = false;
    this.timerMessage = '';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.timerText = minutes + ':' + (secs < 10 ? '0' : '') + secs;
  }

  startCountdown(): void {
    if (this.timerRunning) return;
    if (this.timerRemaining <= 0) {
      this.timerRemaining = this.timerSeconds;
    }
    this.timerDone = false;
    this.timerMessage = '';
    this.timerRunning = true;

    this.countdownTimer = setInterval(() => {
      if (this.timerRemaining <= 1) {
        this.timerRemaining = 0;
        this.timerText = '0:00';
        clearInterval(this.countdownTimer);
        this.timerRunning = false;
        this.timerDone = true;
        this.timerMessage = 'Temps écoulé. Tu peux exporter.';
        return;
      }
      this.timerRemaining--;
      const minutes = Math.floor(this.timerRemaining / 60);
      const seconds = this.timerRemaining % 60;
      this.timerText = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }, 1000);
  }

  pauseCountdown(): void {
    clearInterval(this.countdownTimer);
    this.timerRunning = false;
  }

  resetCountdown(): void {
    clearInterval(this.countdownTimer);
    this.timerRunning = false;
    this.timerRemaining = this.timerSeconds;
    this.timerDone = false;
    this.timerMessage = '';
    const minutes = Math.floor(this.timerRemaining / 60);
    const seconds = this.timerRemaining % 60;
    this.timerText = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }

  setActiveExp(n: number): void {
    this.activeExp = n;
  }

  get expInstructions(): string {
    if (this.activeExp === 1) {
      return 'Cliquer sur « Préparer (1 msg/s) », lancer les 3 connexions ou « Reprendre messages » si nécessaire, chrono 2 min, puis exporter le CSV.';
    }
    if (this.activeExp === 2) {
      return 'Pour chaque palier (1/10/50/100 msg/s) => sélectionner le palier, effacer mesures, lancer les 3 connexions ou « Reprendre messages » si nécessaire, chrono 1 min, export.';
    }
    return 'CLiquer sur « Préparer », lancer les 3 connexions ou « Reprendre messages » si nécessaire, chrono 30 s, marquer coupure + « sudo ./backend/utils/simulate-network-cut.sh 5 », export journal. Répéter 2-3 fois.';
  }

  async prepareExp1(): Promise<void> {
    this.activeExp = 1;
    this.exportPrefix = 'exp1';
    this.clearMeasurements();
    this.setTimer(120);
    try {
      await this.postIntervalMs(1000);
      this.expPrepared = 1;
      this.configMessage = 'Exp. 1 prête : lancer les 3 connexions, chrono 2 min, puis exporter le CSV.';
    } catch (e) {
      this.expPrepared = 0;
      this.configMessage = 'Erreur : ' + (e instanceof Error ? e.message : String(e));
    }
    this.cdr.markForCheck();
  }

  async prepareExp3(): Promise<void> {
    this.activeExp = 3;
    this.exportPrefix = 'exp3';
    this.clearExp3Log();
    try {
      await this.postIntervalMs(1000);
      this.expPrepared = 3;
      this.exp3Message = 'Exp. 3 prête. Connexions, chrono 30 s, coupure réseau, export journal.';
    } catch (e) {
      this.expPrepared = 0;
      this.configMessage = 'Erreur : ' + (e instanceof Error ? e.message : String(e));
    }
    this.cdr.markForCheck();
  }

  private async readServerConfig(
    res: Response,
  ): Promise<{ intervalMs: number; paused?: boolean; error?: string }> {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Réponse serveur invalide, relancer npm run sse');
    }
  }

  private applyServerConfig(body: { intervalMs: number; paused?: boolean }): void {
    this.serverIntervalMs = body.intervalMs;
    if (typeof body.paused === 'boolean') {
      this.serversPaused = body.paused;
    }
  }

  private async postIntervalMs(ms: number): Promise<void> {
    const res = await fetch(this.sseApiUrl('/api/config/interval'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intervalMs: ms, paused: false }),
    });
    const body = await this.readServerConfig(res);
    if (!res.ok) throw new Error(body.error);
    this.applyServerConfig(body);
    this.showPauseBanner = false;
  }

  async fetchServerInterval(): Promise<void> {
    try {
      const res = await fetch(this.sseApiUrl('/api/config/interval'));
      if (!res.ok) return;
      const body = await this.readServerConfig(res);
      if (body.paused) {
        await this.setServerPaused(false, { silent: true });
      } else {
        this.applyServerConfig(body);
      }
      this.showPauseBanner = false;
      this.cdr.markForCheck();
    } catch {
      // serveur SSE pas démarré
    }
  }

  private async setServerPaused(
    paused: boolean,
    opts: { silent?: boolean } = {},
  ): Promise<void> {
    const res = await fetch(this.sseApiUrl('/api/config/interval'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused }),
    });
    const body = await this.readServerConfig(res);
    if (!res.ok) throw new Error(body.error);
    this.applyServerConfig(body);
    if (!opts.silent) {
      this.configMessage = body.paused ? '' : 'Messages repris sur les 3 serveurs.';
    }
    this.cdr.markForCheck();
  }

  async toggleServerPause(): Promise<void> {
    const next = !this.serversPaused;
    try {
      await this.setServerPaused(next);
      this.showPauseBanner = next;
    } catch (e) {
      this.configMessage = 'Erreur : ' + (e instanceof Error ? e.message : String(e));
    }
  }

  async applyExp2Rate(intervalMs: number, prefix: string): Promise<void> {
    this.activeExp = 2;
    this.exportPrefix = prefix;
    try {
      await this.postIntervalMs(intervalMs);
      this.expPrepared = 2;
      this.configMessage = 'Palier ok. Effacer les mesures, connexions, chrono 1 min, export.';
    } catch (e) {
      this.expPrepared = 0;
      this.configMessage = 'Erreur : ' + (e instanceof Error ? e.message : String(e));
    }
    this.cdr.markForCheck();
  }

  markNetworkCut(): void {
    this.exp3Events.push({ protocol: 'all', event: 'cut', timestamp: Date.now() });
    this.exp3CutMarked = true;
    this.exp3Message = 'Coupure marquée à ' + new Date().toLocaleTimeString();
    this.cdr.markForCheck();
  }

  clearExp3Log(): void {
    this.exp3Events = [];
    this.exp3CutMarked = false;
    this.lastReconnectWs = null;
    this.lastReconnectSse = null;
    this.lastReconnectWt = null;
    this.wsDisconnectAt = null;
    this.sseDisconnectAt = null;
    this.wtDisconnectAt = null;
    this.resetLinkPhasesAfterLogClear();
  }

  async exportExp3Log(): Promise<void> {
    if (this.exp3Events.length === 0) {
      alert('Journal exp. 3 vide.');
      return;
    }

    const rows = [];
    for (const e of this.exp3Events) {
      let value = 1;
      if (e.event === 'cut') value = -1;
      if (e.event === 'disconnect') value = 0;
      rows.push({
        protocol: e.protocol,
        latency: e.reconnectionMs ? e.reconnectionMs : 0,
        value: value,
        timestamp: e.timestamp,
      });
    }

    await this.postCsvExport(rows, 'exp3_log', 'Export impossible.');
  }

  reconnectAll(): void {
    this.disconnectAll();
    setTimeout(() => {
      this.wsManualOff = false;
      this.sseManualOff = false;
      this.wtManualOff = false;
      if (!this.wsConnected) this.connectWebSocket();
      if (!this.sseConnected) this.connectSSE();
      if (!this.wtConnected) void this.connectWebTransport();
    }, 300);
  }

  disconnectAll(): void {
    this.disconnectWebSocket();
    this.disconnectSSE();
    this.disconnectWebTransport();
  }

  clearMeasurements(): void {
    this.metrics.clearAll();
    this.wsLastValue = 0;
    this.wsAvgLatency = 0;
    this.wsMinLatency = 0;
    this.wsMaxLatency = 0;
    this.wsThroughput = 0;
    this.wsLatencies = [];
    this.sseLastValue = 0;
    this.sseAvgLatency = 0;
    this.sseMinLatency = 0;
    this.sseMaxLatency = 0;
    this.sseThroughput = 0;
    this.sseLatencies = [];
    this.wtLastValue = 0;
    this.wtAvgLatency = 0;
    this.wtMinLatency = 0;
    this.wtMaxLatency = 0;
    this.wtThroughput = 0;
    this.wtLatencies = [];
    this.wsChartMax = 1;
    this.sseChartMax = 1;
    this.wtChartMax = 1;
    this.exportMessage = null;
  }

  private async postCsvExport(
    measurements: object[],
    prefix: string,
    errorPrefix: string,
  ): Promise<void> {
    this.exportMessage = null;
    try {
      const res = await fetch(this.sseApiUrl('/api/export/csv'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measurements, prefix }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      this.exportMessage = 'CSV : data/' + body.filename + ' (' + body.count + ' mesures)';
    } catch (e) {
      alert(errorPrefix + '\n' + (e instanceof Error ? e.message : e));
    }
  }

  async exportCSV(): Promise<void> {
    const data = this.metrics.getAllMeasurements();
    if (data.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }
    await this.postCsvExport(
      data,
      this.exportPrefix,
      'Export impossible (SSE sur 3002 ?).',
    );
  }

  barHeight(latency: number, max: number): number {
    const cap = max > 0 ? max : 1;
    return Math.max(4, Math.round((latency / cap) * 100));
  }

  /** Même hôte que la page (obligatoire exp. 3 WSL : évite localhost côté Windows). */
  private backendHost(): string {
    return window.location.hostname || WT_SETUP_HOST;
  }

  private sseApiUrl(path: string): string {
    return `http://${this.backendHost()}:${SSE_PORT}${path}`;
  }

  linkBadge(phase: string, reconnectMs: number | null): string {
    if (phase === 'on') return 'Connecté';
    if (phase === 'reconnecting') return 'Reconnexion…';
    if (phase === 'reconnected') {
      return reconnectMs != null ? `Reconnecté · ${reconnectMs} ms` : 'Reconnecté';
    }
    return 'Déconnecté';
  }

  private resetLinkPhasesAfterLogClear(): void {
    this.wsPhase = this.wsConnected ? 'on' : this.wsReconnectTimer ? 'reconnecting' : 'off';
    this.ssePhase = this.sseConnected ? 'on' : this.sseReconnectTimer ? 'reconnecting' : 'off';
    this.wtPhase = this.wtConnected ? 'on' : this.wtReconnectTimer ? 'reconnecting' : 'off';
  }

  /** Coupure iptables : TCP peut rester « ouvert » sans messages → on force la reconnexion. */
  private checkMessageStalls(): void {
    if (this.serversPaused) return;
    const threshold = this.exp3CutMarked
      ? Math.max(2000, this.serverIntervalMs * 2)
      : Math.max(3000, this.serverIntervalMs * 3);
    const now = Date.now();
    if (this.wsConnected && this.lastMsgWs > 0 && now - this.lastMsgWs > threshold) {
      this.forceWsStaleReconnect();
    }
    if (this.sseConnected && this.lastMsgSse > 0 && now - this.lastMsgSse > threshold) {
      this.forceSseStaleReconnect();
    }
    if (this.wtConnected && this.lastMsgWt > 0 && now - this.lastMsgWt > threshold) {
      this.forceWtStaleReconnect();
    }
  }

  private forceWsStaleReconnect(): void {
    if (!this.wsConnected || this.wsManualOff || this.wsPhase === 'reconnecting') return;
    this.lastMsgWs = Date.now();
    if (this.wsDisconnectAt == null) {
      this.wsDisconnectAt = Date.now();
      this.exp3Events.push({ protocol: 'websocket', event: 'disconnect', timestamp: Date.now() });
    }
    this.wsPhase = 'reconnecting';
    this.wsConnected = false;
    this.metrics.stopWebSocketThroughput();
    this.wsThroughput = 0;
    this.wsSocket?.close();
    this.cdr.markForCheck();
  }

  private forceSseStaleReconnect(): void {
    if (!this.sseConnected || this.sseManualOff || this.ssePhase === 'reconnecting') return;
    this.lastMsgSse = Date.now();
    if (this.sseDisconnectAt == null) {
      this.sseDisconnectAt = Date.now();
      this.exp3Events.push({ protocol: 'sse', event: 'disconnect', timestamp: Date.now() });
    }
    this.ssePhase = 'reconnecting';
    this.sseConnected = false;
    this.metrics.stopSseThroughput();
    this.sseThroughput = 0;
    this.sseSource?.close();
    this.scheduleSseReconnect();
    this.cdr.markForCheck();
  }

  private forceWtStaleReconnect(): void {
    if (!this.wtConnected || this.wtManualOff || this.wtPhase === 'reconnecting') return;
    this.lastMsgWt = Date.now();
    if (this.wtDisconnectAt == null) {
      this.wtDisconnectAt = Date.now();
      this.exp3Events.push({ protocol: 'webtransport', event: 'disconnect', timestamp: Date.now() });
    }
    this.wtPhase = 'reconnecting';
    this.wtConnected = false;
    this.metrics.stopWebTransportThroughput();
    this.wtThroughput = 0;
    this.wtTransport?.close();
    this.cdr.markForCheck();
  }

  private scheduleSseReconnect(): void {
    if (!this.autoReconnect || this.sseManualOff || this.sseReconnectTimer) return;
    this.sseReconnectTimer = setTimeout(() => {
      this.sseReconnectTimer = undefined;
      if (!this.sseConnected) this.connectSSE();
    }, 1000);
  }

  connectWebSocket(): void {
    this.wsManualOff = false;
    clearTimeout(this.wsReconnectTimer);
    this.wsSocket?.close();
    this.wsSocket = new WebSocket(`ws://${this.backendHost()}:${WS_PORT}`);

    this.wsSocket.onopen = () => {
      this.wsConnected = true;
      this.lastMsgWs = Date.now();
      this.metrics.startWebSocketThroughput();

      if (this.wsDisconnectAt != null) {
        const ms = Date.now() - this.wsDisconnectAt;
        this.wsDisconnectAt = null;
        this.lastReconnectWs = ms;
        this.wsPhase = 'reconnected';
        this.exp3Events.push({ protocol: 'websocket', event: 'reconnect', timestamp: Date.now(), reconnectionMs: ms });
        this.exp3Message = 'websocket reconnecté en ' + ms + ' ms';
      } else {
        this.wsPhase = 'on';
      }
      this.cdr.markForCheck();
    };

    this.wsSocket.onmessage = (event) => {
      const receivedAt = Date.now();
      this.lastMsgWs = receivedAt;
      const data = JSON.parse(event.data);
      this.metrics.addWebSocketMeasurement(data.timestamp, data.value, receivedAt);
      this.wsLastValue = Math.round(data.value);
      this.wsAvgLatency = this.metrics.getWebSocketAverageLatency();
      this.wsMinLatency = this.metrics.getWebSocketMinLatency();
      this.wsMaxLatency = this.metrics.getWebSocketMaxLatency();
      this.wsLatencies = this.metrics.getWebSocketLastLatencies();
      if (this.wsLatencies.length > 0) {
        this.wsChartMax = Math.max(...this.wsLatencies);
      }
      this.cdr.markForCheck();
    };

    this.wsSocket.onclose = () => {
      this.wsConnected = false;
      this.metrics.stopWebSocketThroughput();
      this.wsThroughput = 0;

      if (!this.wsManualOff) {
        if (this.wsDisconnectAt == null) {
          this.wsDisconnectAt = Date.now();
          this.wsPhase = 'reconnecting';
          this.exp3Events.push({ protocol: 'websocket', event: 'disconnect', timestamp: Date.now() });
        } else {
          this.wsPhase = 'reconnecting';
        }
        if (this.autoReconnect && !this.wsReconnectTimer) {
          this.wsReconnectTimer = setTimeout(() => {
            this.wsReconnectTimer = undefined;
            if (!this.wsConnected) this.connectWebSocket();
          }, 1000);
        }
      }
      this.cdr.markForCheck();
    };
  }

  disconnectWebSocket(): void {
    this.wsManualOff = true;
    clearTimeout(this.wsReconnectTimer);
    this.wsSocket?.close();
    this.wsConnected = false;
    this.wsPhase = 'off';
    this.lastMsgWs = 0;
    this.metrics.stopWebSocketThroughput();
    this.wsThroughput = 0;
  }

  connectSSE(): void {
    this.sseManualOff = false;
    clearTimeout(this.sseReconnectTimer);
    this.sseSource?.close();
    this.sseSource = new EventSource(this.sseApiUrl('/events'));

    this.sseSource.onopen = () => {
      this.sseConnected = true;
      this.lastMsgSse = Date.now();
      this.metrics.startSseThroughput();

      if (this.sseDisconnectAt != null) {
        const ms = Date.now() - this.sseDisconnectAt;
        this.sseDisconnectAt = null;
        this.lastReconnectSse = ms;
        this.ssePhase = 'reconnected';
        this.exp3Events.push({ protocol: 'sse', event: 'reconnect', timestamp: Date.now(), reconnectionMs: ms });
        this.exp3Message = 'sse reconnecté en ' + ms + ' ms';
      } else {
        this.ssePhase = 'on';
      }
      this.cdr.markForCheck();
    };

    this.sseSource.onmessage = (event) => {
      const receivedAt = Date.now();
      this.lastMsgSse = receivedAt;
      const data = JSON.parse(event.data);
      this.metrics.addSseMeasurement(data.timestamp, data.value, receivedAt);
      this.sseLastValue = Math.round(data.value);
      this.sseAvgLatency = this.metrics.getSseAverageLatency();
      this.sseMinLatency = this.metrics.getSseMinLatency();
      this.sseMaxLatency = this.metrics.getSseMaxLatency();
      this.sseLatencies = this.metrics.getSseLastLatencies();
      if (this.sseLatencies.length > 0) {
        this.sseChartMax = Math.max(...this.sseLatencies);
      }
      this.cdr.markForCheck();
    };

    this.sseSource.onerror = () => {
      this.sseConnected = false;
      this.metrics.stopSseThroughput();
      this.sseThroughput = 0;

      if (!this.sseManualOff) {
        if (this.sseDisconnectAt == null) {
          this.sseDisconnectAt = Date.now();
          this.exp3Events.push({ protocol: 'sse', event: 'disconnect', timestamp: Date.now() });
        }
        this.ssePhase = 'reconnecting';
        this.sseSource?.close();
        this.scheduleSseReconnect();
      } else {
        this.ssePhase = 'off';
      }
      this.cdr.markForCheck();
    };
  }

  disconnectSSE(): void {
    this.sseManualOff = true;
    clearTimeout(this.sseReconnectTimer);
    this.sseSource?.close();
    this.sseConnected = false;
    this.ssePhase = 'off';
    this.lastMsgSse = 0;
    this.metrics.stopSseThroughput();
    this.sseThroughput = 0;
  }

  async connectWebTransport(): Promise<void> {
    this.wtManualOff = false;
    this.wtError = null;
    if (this.wtConnected) return;

    clearTimeout(this.wtReconnectTimer);
    this.wtTransport?.close();
    this.wtTransport = null;
    this.wtConnected = false;
    this.metrics.stopWebTransportThroughput();
    this.wtThroughput = 0;

    try {
      const host = window.location.hostname;
      const origin = window.location.origin;

      if (
        typeof globalThis.WebTransport === 'undefined' &&
        origin.startsWith('http://') &&
        !origin.includes('localhost')
      ) {
        this.wtError =
          'Contexte non sécurisé. Relancez Chrome via ./backend/utils/launch-chrome-webtransport.sh';
        return;
      }

      if (host === 'localhost' || host === '127.0.0.1') {
        console.warn(
          'Ouvrir via http://' + WT_SETUP_HOST + ':4200 (exp. 3 : localhost contourne la coupure WSL)',
        );
      }

      const binary = atob(WT_HASH_BASE64);
      const hashBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        hashBytes[i] = binary.charCodeAt(i);
      }
      const hashBuffer = hashBytes.buffer.slice(
        hashBytes.byteOffset,
        hashBytes.byteOffset + hashBytes.byteLength,
      ) as ArrayBuffer;

      this.wtTransport = new WebTransportClient('https://' + host + ':' + WT_PORT + '/webtransport', {
        serverCertificateHashes: [{ algorithm: 'sha-256', value: hashBuffer }],
      });

      await this.wtTransport.ready;
      this.wtConnected = true;
      this.lastMsgWt = Date.now();
      this.metrics.startWebTransportThroughput();

      if (this.wtDisconnectAt != null) {
        const ms = Date.now() - this.wtDisconnectAt;
        this.wtDisconnectAt = null;
        this.lastReconnectWt = ms;
        this.wtPhase = 'reconnected';
        this.exp3Events.push({ protocol: 'webtransport', event: 'reconnect', timestamp: Date.now(), reconnectionMs: ms });
        this.exp3Message = 'webtransport reconnecté en ' + ms + ' ms';
      } else {
        this.wtPhase = 'on';
      }
      this.cdr.markForCheck();

      this.wtTransport.closed.then(() => {
        this.wtConnected = false;
        this.metrics.stopWebTransportThroughput();
        this.wtThroughput = 0;

        if (!this.wtManualOff) {
          if (this.wtDisconnectAt == null) {
            this.wtDisconnectAt = Date.now();
            this.exp3Events.push({ protocol: 'webtransport', event: 'disconnect', timestamp: Date.now() });
          }
          this.wtPhase = 'reconnecting';
          if (this.autoReconnect && !this.wtReconnectTimer) {
            this.wtReconnectTimer = setTimeout(() => {
              this.wtReconnectTimer = undefined;
              if (!this.wtConnected) void this.connectWebTransport();
            }, 1000);
          }
        }
        this.cdr.markForCheck();
      });

      const reader = this.wtTransport.datagrams.readable.getReader();
      const decoder = new TextDecoder();

      while (this.wtConnected) {
        const result = await reader.read();
        if (result.done) break;
        if (!result.value || result.value.byteLength === 0) continue;

        const receivedAt = Date.now();
        this.lastMsgWt = receivedAt;
        const data = JSON.parse(decoder.decode(result.value));
        this.metrics.addWebTransportMeasurement(data.timestamp, data.value, receivedAt);
        this.wtLastValue = Math.round(data.value);
        this.wtAvgLatency = this.metrics.getWebTransportAverageLatency();
        this.wtMinLatency = this.metrics.getWebTransportMinLatency();
        this.wtMaxLatency = this.metrics.getWebTransportMaxLatency();
        this.wtLatencies = this.metrics.getWebTransportLastLatencies();
        if (this.wtLatencies.length > 0) {
          this.wtChartMax = Math.max(...this.wtLatencies);
        }
        this.cdr.markForCheck();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('handshake') || msg.includes('certificate')) {
        this.wtError = 'Échec wss : relancer npm run webtransport et vérifier le certificat.';
      }
      this.wtConnected = false;
      this.wtPhase = this.autoReconnect && !this.wtManualOff ? 'reconnecting' : 'off';
      this.cdr.markForCheck();
    }
  }

  disconnectWebTransport(): void {
    this.wtManualOff = true;
    clearTimeout(this.wtReconnectTimer);
    this.wtTransport?.close();
    this.wtConnected = false;
    this.wtPhase = 'off';
    this.lastMsgWt = 0;
    this.metrics.stopWebTransportThroughput();
    this.wtThroughput = 0;
  }
}
