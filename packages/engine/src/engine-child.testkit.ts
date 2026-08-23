import { expect, vi } from 'vitest';

import type { OpenListeners } from './engine-runtime';
import type { ParentPort } from './parent-port';

import { urlOf } from './asked-url.testkit';

export type Parent = {
  reports: unknown[];
  send: (directive: unknown) => void;
  port: ParentPort;
};

export function aParent(): Parent {
  const reports: unknown[] = [];
  const handlers: ((messageEvent: { data: unknown }) => void)[] = [];

  return {
    reports,
    send: (directive) => {
      for (const handler of handlers) {
        handler({ data: directive });
      }
    },
    port: {
      postMessage: (message) => {
        reports.push(message);
      },
      on: (event: string, handler: (messageEvent: { data: unknown }) => void) => {
        if (event === 'message') {
          handlers.push(handler);
        }
      },
    },
  };
}

const firstPartyHosts: Record<'anthropic' | 'openai', string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com',
};

/**
 * @summary The parent resolves where a key is spent before the directive leaves it, so a scenario
 * that only cares which host was reached says the vendor and lets the helper name the address.
 */
export function aProbeOf(id: string, provider: 'anthropic' | 'openai', key: string) {
  return {
    kind: 'probe',
    id,
    origin: firstPartyHosts[provider],
    custody: { custody: 'provider-key', provider, credential: key },
  };
}

export function aLoopbackHolding(heldPorts: readonly number[]): OpenListeners {
  return async (_app, port) =>
    Promise.resolve(
      heldPorts.includes(port)
        ? { failed: { port } }
        : { opened: { close: async () => Promise.resolve() } },
    );
}

export async function reportsReach(parent: Parent, count: number): Promise<void> {
  await vi.waitFor(() => {
    expect(parent.reports).toHaveLength(count);
  });
}

export function fetchAnswering(
  status: number,
  body: string | null = null,
): { urls: string[]; fetchLike: typeof fetch } {
  const urls: string[] = [];

  const fetchLike: typeof fetch = async (input) => {
    urls.push(urlOf(input));

    return Promise.resolve(new Response(body, { status }));
  };

  return { urls, fetchLike };
}
