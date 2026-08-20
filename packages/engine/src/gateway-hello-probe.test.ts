import { describe, expect, test } from 'vitest';

import { createGatewayApp } from './gateway-app';
import { aGatewayHolding, grantsNothing, neverFetches } from './gateway-app.testkit';
import { collectingRows } from './gateway-logs.testkit';

const HELLO = 'http://127.0.0.1:8397/api/hello';

async function probing(method: 'GET' | 'HEAD'): Promise<Response> {
  const codex = createGatewayApp(aGatewayHolding(), grantsNothing, neverFetches);

  return codex.request(HELLO, { method });
}

describe('the hello probe a client health-checks its base URL with', () => {
  test('a read of the probe answers the way the real endpoint answers', async () => {
    const answer = await probing('GET');

    expect(answer.status).toBe(200);
    await expect(answer.json()).resolves.toEqual({ message: 'hello' });
  });

  test('a bare head of the probe answers too, because that is the check a client makes first', async () => {
    const answer = await probing('HEAD');

    expect(answer.status).toBe(200);
    await expect(answer.text()).resolves.toBe('');
  });

  test('the probe spends no account, so a gateway holding no credential still answers it', async () => {
    const answer = await probing('GET');

    expect(answer.status).toBe(200);
  });

  test('the probe is no request a person routed, so it leaves no row in the drawer', async () => {
    const collected = collectingRows();

    await probing('GET');
    collected.forget();

    expect(collected.standing()).toEqual([]);
  });
});
