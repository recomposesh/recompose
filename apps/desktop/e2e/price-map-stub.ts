import type { IncomingMessage, ServerResponse } from 'node:http';

import { createServer } from 'node:http';

import { bindToAFreePort } from './loopback-ports';

const ACCEPTED = 200;

const NOTHING_THERE = 404;

const PRICE_MAP_PATH = '/BerriAI/litellm/main/model_prices_and_context_window.json';

const REGISTRY_PATH = '/api.json';

const PRICES = {
  'claude-sonnet-5': {
    litellm_provider: 'anthropic',
    input_cost_per_token: 0.000_003,
    output_cost_per_token: 0.000_015,
  },
};

const REGISTRY = { opencode: { models: {} } };

export type PriceMapStub = { origin: string; dispose: () => Promise<void> };

function answer(response: ServerResponse, body: unknown): void {
  response.writeHead(ACCEPTED, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

function route(request: IncomingMessage, response: ServerResponse): void {
  if (request.url === PRICE_MAP_PATH) {
    answer(response, PRICES);

    return;
  }

  if (request.url === REGISTRY_PATH) {
    answer(response, REGISTRY);

    return;
  }

  response.writeHead(NOTHING_THERE);
  response.end();
}

/**
 * The price map and the model registry, answered from this machine.
 *
 * @summary Both refresh on boot, so every scenario would otherwise reach two vendor hosts before it
 * did anything a person asked for. That makes a suite answer differently offline, charges every
 * scenario for two round trips, and puts a third party in the path of a test that has nothing to do
 * with prices. The app honors `RECOMPOSE_PRICE_ORIGIN` only when it names a loopback host.
 */
export async function fakePriceMap(): Promise<PriceMapStub> {
  const server = createServer(route);
  const port = await bindToAFreePort(server, '127.0.0.1');

  return {
    origin: `http://127.0.0.1:${String(port)}`,
    dispose: async () =>
      new Promise<void>((settle) => {
        server.close(() => {
          settle();
        });
      }),
  };
}
