import type { LogRow, SpendGrant } from '@recompose/contracts';
import type { Hono } from 'hono';

import { createGatewayApp } from './gateway-app';
import {
  aGatewayHolding,
  aVirtualModel,
  fetchAnsweringWith,
  granting,
  grantsNothing,
  neverFetches,
} from './gateway-app.testkit';
import { collectingRows } from './gateway-logs.testkit';

export const codex = aGatewayHolding(aVirtualModel());

export const aTurn = JSON.stringify({
  model: 'fast',
  messages: [{ role: 'user', content: 'hello' }],
});

const loopbackClient = { incoming: { socket: { remoteAddress: '127.0.0.1' } } };

function aWorkGrant(): SpendGrant {
  return {
    verdict: 'resolved',
    providerOrigin: 'http://127.0.0.1:4242',
    spend: {
      custody: 'credentialed',
      provider: 'openai',
      credential: 'sk-live-40d1',
      accountId: 'work',
    },
  };
}

export function servingGateway(answer: () => Response): Hono {
  const { fetchLike } = fetchAnsweringWith(answer);

  return createGatewayApp(codex, granting(aWorkGrant()).grantFor, fetchLike);
}

export function refusingGateway(): Hono {
  return createGatewayApp(codex, grantsNothing, neverFetches);
}

export async function ask(app: Hono, body: string, userAgent = 'curl/8.7.1'): Promise<string> {
  const answer = await app.request(
    'http://127.0.0.1:8397/v1/chat/completions',
    { method: 'POST', body, headers: { 'user-agent': userAgent } },
    loopbackClient,
  );

  return answer.text();
}

export async function rowsWhile(serving: () => Promise<void>): Promise<LogRow[]> {
  const collected = collectingRows();

  await serving();
  collected.forget();

  return collected.standing();
}

export async function rowsFrom(app: Hono, body = aTurn, userAgent?: string): Promise<LogRow[]> {
  return rowsWhile(async () => {
    await ask(app, body, userAgent);
  });
}
