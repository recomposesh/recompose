import type { RequestListener, Server } from 'node:http';
import type { Socket } from 'node:net';

import { firstEventBoundMs, proxyFetchBoundMs } from '@recompose/contracts';
import { createServer } from 'node:http';
import { createServer as createSocketServer } from 'node:net';
import { getGlobalDispatcher } from 'undici';
import { describe, expect, it } from 'vitest';

import { providerSilenceBoundMs } from '../provider-bounds';
import { providerFetch } from './provider-dispatcher';

type StandingProvider = { close: () => Promise<void>; url: string };

function portOf(standing: { address: () => ReturnType<Server['address']> }): number {
  const address = standing.address();

  return typeof address === 'object' && address !== null ? address.port : 0;
}

async function providerServing(handler: RequestListener): Promise<StandingProvider> {
  const server = createServer(handler);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  return {
    url: `http://127.0.0.1:${portOf(server)}/`,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    },
  };
}

async function providerNeverAnswering(): Promise<StandingProvider> {
  const holding: Socket[] = [];
  const server = createSocketServer((socket) => {
    socket.on('error', () => undefined);
    holding.push(socket);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  return {
    url: `http://127.0.0.1:${portOf(server)}/`,
    close: async () => {
      for (const socket of holding) {
        socket.destroy();
      }

      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    },
  };
}

function opensThenFallsSilent(): RequestListener {
  return (_request, response) => {
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    response.flushHeaders();
    response.write(':');
  };
}

function keepsSending(gapMs: number, parts: number): RequestListener {
  return (_request, response) => {
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    response.flushHeaders();
    response.write(':');

    let sent = 0;
    const beat = setInterval(() => {
      sent += 1;
      response.write(':part\n');

      if (sent >= parts) {
        clearInterval(beat);
        response.end();
      }
    }, gapMs);
  };
}

async function readToEnd(answer: Response): Promise<void> {
  const reader = answer.body?.getReader();

  if (reader === undefined) return;

  for (;;) {
    const { done } = await reader.read();

    if (done) return;
  }
}

function carries(value: unknown): value is { code: unknown } {
  return typeof value === 'object' && value !== null && 'code' in value;
}

function transportFailureCode(failure: unknown): unknown {
  if (!(failure instanceof Error)) return undefined;

  return carries(failure.cause) ? failure.cause.code : undefined;
}

describe('the transport a provider request travels on', () => {
  it('should give up on a provider that opens its answer and then falls silent', async () => {
    const provider = await providerServing(opensThenFallsSilent());
    const reach = providerFetch(300);

    const outcome = await reach(provider.url)
      .then(readToEnd)
      .then(() => 'carried')
      .catch((failure: unknown) => failure);

    await provider.close();

    expect(transportFailureCode(outcome)).toBe('UND_ERR_BODY_TIMEOUT');
  });

  it('should carry an answer whose parts keep arriving, however long the whole answer runs', async () => {
    const provider = await providerServing(keepsSending(60, 10));
    const reach = providerFetch(300);

    const outcome = await reach(provider.url)
      .then(readToEnd)
      .then(() => 'carried')
      .catch((failure: unknown) => failure);

    await provider.close();

    expect(outcome).toBe('carried');
  });

  it('should give up on a provider that never opens its answer at all', async () => {
    const provider = await providerNeverAnswering();
    const reach = providerFetch(300);

    const outcome = await reach(provider.url)
      .then(() => 'answered')
      .catch((failure: unknown) => failure);

    await provider.close();

    expect(transportFailureCode(outcome)).toBe('UND_ERR_HEADERS_TIMEOUT');
  });

  it('should leave every other request the process makes on the dispatcher it already had', () => {
    const before = getGlobalDispatcher();

    providerFetch(300);

    expect(getGlobalDispatcher()).toBe(before);
  });

  it('should wait past the point the gateway stops waiting for a first event, and never past the whole request', () => {
    expect(providerSilenceBoundMs).toBeGreaterThan(firstEventBoundMs);
    expect(providerSilenceBoundMs).toBeLessThanOrEqual(proxyFetchBoundMs);
  });
});
