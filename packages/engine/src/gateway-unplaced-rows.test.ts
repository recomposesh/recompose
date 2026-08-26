import type { LogRow } from '@recompose/contracts';
import type { MockInstance } from 'vitest';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createGatewayApp } from './gateway-app';
import {
  aCredentialedGrant,
  aGatewayHolding,
  aVirtualModel,
  granting,
  neverFetches,
} from './gateway-app.testkit';
import { collectingRows } from './gateway-logs.testkit';
import {
  aLadderOver,
  answeringInTurn,
  refusedWith,
  served,
  serving,
} from './gateway-router.testkit';
import { providerObservability } from './provider/provider-observability';

const loopbackClient = { incoming: { socket: { remoteAddress: '127.0.0.1' } } };

const aTurn = JSON.stringify({ model: 'fast', messages: [{ role: 'user', content: 'hello' }] });

const aLadder = () => aLadderOver('gpt-5-mini', 'claude-sonnet-4-5');

const coolingRefusal = () => refusedWith(429, { error: 'slow down' }, { 'retry-after': '60' });

const droppedConnection = (): Response => {
  throw new Error('connect ECONNREFUSED 127.0.0.1:4242');
};

async function rowsAskingTheRemovedTarget(): Promise<LogRow[]> {
  const gone = aGatewayHolding(aVirtualModel({ target: { standing: 'removed' } }));
  const app = createGatewayApp(gone, granting(aCredentialedGrant()).grantFor, neverFetches);
  const collected = collectingRows();
  const refusal = await app.request(
    'http://127.0.0.1:8397/v1/chat/completions',
    { method: 'POST', body: aTurn, headers: { 'user-agent': 'curl/8.7.1' } },
    loopbackClient,
  );

  await refusal.text();
  collected.forget();

  return collected.standing();
}

let complaints: MockInstance;

beforeEach(() => {
  complaints = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  complaints.mockRestore();
  providerObservability().clear();
});

describe('a target the table already stands unbound', () => {
  test('the request leaves a row, the same way a target that left mid-walk does', async () => {
    const rows = await rowsAskingTheRemovedTarget();

    expect(rows).toMatchObject([
      {
        gateway: 'codex',
        virtualModel: 'fast',
        origin: 'gateway',
        method: 'POST',
        status: 502,
        failure: 'The gateway "Codex" holds no target for the virtual model "fast".',
      },
    ]);
  });

  test('the row leaves its provider cells empty, because no provider was ever asked', async () => {
    const rows = await rowsAskingTheRemovedTarget();

    expect(rows.at(0)?.provider).toBeUndefined();
    expect(rows.at(0)?.providerModel).toBeUndefined();
  });
});

describe('a request refused while every child stands cooling', () => {
  test('it leaves a row saying the ladder had nothing left to try', async () => {
    const scene = serving(aLadder(), answeringInTurn(coolingRefusal));

    await (await scene.ask()).text();

    const collected = collectingRows();
    const refused = await scene.ask();

    await refused.text();
    collected.forget();

    const rows = collected.standing();

    expect(refused.status).toBe(429);
    expect(rows).toHaveLength(1);
    expect(rows.at(0)).toMatchObject({ origin: 'gateway', status: 429, virtualModel: 'fast' });
    expect(rows.at(0)?.failure).toContain('has no child left to try');
    expect(rows.at(0)?.failure).toContain('stands cooling');
  });

  test('the row names the ladder that ran out and every child it stood over', async () => {
    const scene = serving(aLadder(), answeringInTurn(coolingRefusal));

    await (await scene.ask()).text();

    const collected = collectingRows();

    await (await scene.ask()).text();
    collected.forget();

    expect(collected.standing().at(0)?.diagnosis).toEqual({
      router: 'Failover',
      tried: [
        { child: 'gpt-5-mini', why: 'stands cooling' },
        { child: 'claude-sonnet-4-5', why: 'stands cooling' },
      ],
    });
  });

  test('the row stands for a request no child ever carried', async () => {
    const scene = serving(aLadder(), answeringInTurn(coolingRefusal));

    await (await scene.ask()).text();

    const spentWalking = scene.asked.length;

    await (await scene.ask()).text();

    expect(scene.asked).toHaveLength(spentWalking);
  });
});

describe('a child that annotated a cable without answering', () => {
  test('every cable the walk painted has a row of its own beside it', async () => {
    const scene = serving(aLadder(), answeringInTurn(droppedConnection, served));
    const collected = collectingRows();
    const answer = await scene.ask();

    await answer.text();
    collected.forget();

    const painted = Object.keys(scene.traffic['codex']?.['fast'] ?? {});

    expect(answer.status).toBe(200);
    expect(painted).toHaveLength(2);
    expect(collected.standing()).toHaveLength(2);
  });

  test('the row for the child nothing answered for reads what its cable reads', async () => {
    const scene = serving(aLadder(), answeringInTurn(droppedConnection, served));
    const collected = collectingRows();

    await (await scene.ask()).text();
    collected.forget();

    const unreached = collected.standing().find((row) => row.origin === 'gateway');

    expect(unreached).toMatchObject({
      status: 502,
      virtualModel: 'fast',
      failure: 'The child could not be reached.',
    });
    expect(scene.traffic['codex']?.['fast']?.['child-1']).toMatchObject({
      outcome: 'failed',
      status: 502,
      detail: 'The child could not be reached.',
    });
  });

  test('the row names the child nothing answered for, which its sentence alone never could', async () => {
    const scene = serving(aLadder(), answeringInTurn(droppedConnection, served));
    const collected = collectingRows();

    await (await scene.ask()).text();
    collected.forget();

    const unreached = collected.standing().find((row) => row.origin === 'gateway');

    expect(unreached?.diagnosis).toEqual({
      tried: [{ child: 'gpt-5-mini', why: 'could not be reached' }],
    });
  });
});

describe('a child a provider answered for', () => {
  test('a child a provider refused carries the words that provider refused it with', async () => {
    const scene = serving(aLadder(), answeringInTurn(coolingRefusal, served));
    const collected = collectingRows();

    await (await scene.ask()).text();
    collected.forget();

    const refused = collected.standing().find((row) => row.status === 429);

    expect(refused?.diagnosis).toEqual({ upstreamMessage: 'slow down' });
  });

  test('a child a provider refused keeps one row, because its attempt already raised it', async () => {
    const scene = serving(aLadder(), answeringInTurn(coolingRefusal, served));
    const collected = collectingRows();

    await (await scene.ask()).text();
    collected.forget();

    const rows = collected.standing();

    expect(Object.keys(scene.traffic['codex']?.['fast'] ?? {})).toHaveLength(2);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.origin === 'provider')).toBe(true);
  });

  test('the child that answered still keeps the row its provider earned', async () => {
    const scene = serving(aLadder(), answeringInTurn(droppedConnection, served));
    const collected = collectingRows();

    await (await scene.ask()).text();
    collected.forget();

    expect(collected.standing().find((row) => row.origin === 'provider')).toMatchObject({
      status: 200,
      providerModel: 'claude-sonnet-4-5',
    });
  });
});
