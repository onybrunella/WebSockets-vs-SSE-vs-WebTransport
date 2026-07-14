declare module '@fails-components/webtransport/browser' {
  export class WebTransportPonyfill {
    constructor(
      url: string,
      options?: {
        serverCertificateHashes?: Array<{ algorithm: string; value: ArrayBuffer }>;
      },
    );
    ready: Promise<void>;
    closed: Promise<unknown>;
    datagrams: { readable: ReadableStream<Uint8Array> };
    close(): void;
  }
}
