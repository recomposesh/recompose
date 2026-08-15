import type { WreqInit } from 'node-wreq';

import type { ProviderRequest } from './claude-request';
import type { SubscriptionWireFetch } from './provider-transport';

type WireCall = { url: string; init: WreqInit };

export type RecordedWire = { calls: WireCall[]; wire: SubscriptionWireFetch };

export function streamOf(body: string | Uint8Array): ReadableStream<Uint8Array> {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

export function requestTo(url: string): ProviderRequest {
  return { url, headers: [['Content-Type', 'application/json']], body: '{}' };
}

export function recordingWire(answering: SubscriptionWireFetch): RecordedWire {
  const calls: WireCall[] = [];

  return {
    calls,
    wire: async (url, init) => {
      calls.push({ url, init });

      return answering(url, init);
    },
  };
}
