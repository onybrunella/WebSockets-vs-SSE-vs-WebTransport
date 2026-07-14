import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export type ProtocolId = 'websocket' | 'sse' | 'webtransport';

export interface PushMessage {
  protocol: ProtocolId;
  timestamp: number;
  value: number;
}

export interface Measurement {
  protocol: ProtocolId;
  latency: number;
  value: number;
  timestamp: number;
}

export interface ProtocolStats {
  connected: boolean;
  count: number;
  lastLatency: number | null;
  avgLatency: number | null;
  lastValue: number | null;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  get wsUrl(): string {
    return this.readRuntime('WS_URL') || environment.wsUrl;
  }

  get sseBase(): string {
    return (this.readRuntime('SSE_URL') || environment.sseUrl).replace(/\/$/, '');
  }

  get wtBase(): string {
    return (this.readRuntime('WT_URL') || environment.wtUrl).replace(/\/$/, '');
  }

  /** Permet d'injecter les URLs au runtime (Docker nginx / window.__ENV__). */
  private readRuntime(key: string): string | null {
    const w = window as unknown as { __ENV__?: Record<string, string> };
    const v = w.__ENV__?.[key];
    if (!v || v.startsWith('__')) return null;
    return v;
  }
}
