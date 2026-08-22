import type { EngineVirtualModel } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import type { ProviderAttempt } from './provider/telemetry-feed';

import {
  aRoutedModel,
  answeringInTurn,
  refusedWith,
  served,
  serving,
} from './gateway-router.testkit';
import { subscribeToProviderAttempts } from './provider/telemetry-feed';

function twoChildren(): EngineVirtualModel {
  return aRoutedModel('failover', [
    { standing: 'bound', providerModel: 'gpt-5-mini' },
    { standing: 'bound', providerModel: 'claude-sonnet-4-5' },
  ]);
}

async function rowsWhile(work: () => Promise<void>): Promise<ProviderAttempt[]> {
  const rows: ProviderAttempt[] = [];
  const forget = subscribeToProviderAttempts((row) => {
    rows.push(row);
  });

  try {
    await work();
  } finally {
    forget();
  }

  return rows;
}

const busy = (): Response => refusedWith(503, { error: 'busy' });

const answered = (): Response => served();

async function askedOver(...answers: readonly (() => Response)[]): Promise<Response> {
  return serving(twoChildren(), answeringInTurn(...answers)).ask();
}

function stillInFlight(rows: readonly ProviderAttempt[]): ProviderAttempt[] {
  const settled = new Set(rows.filter((row) => row.durationMs !== undefined).map((row) => row.id));

  return rows.filter((row) => !settled.has(row.id));
}

describe('the rows a ladder leaves behind', () => {
  it('settles the child it moved on from, so no attempt stands in flight forever', async () => {
    const rows = await rowsWhile(async () => {
      const answer = await askedOver(busy, answered);

      await answer.text();
    });

    expect(rows.length).toBeGreaterThan(1);
    expect(stillInFlight(rows)).toEqual([]);
  });

  it('settles every child of a ladder that ran out entirely', async () => {
    const rows = await rowsWhile(async () => {
      const answer = await askedOver(busy, busy);

      await answer.text();
    });

    expect(stillInFlight(rows)).toEqual([]);
  });

  it('leaves the answer it handed back readable rather than closing it too', async () => {
    const answer = await askedOver(busy, () => served('the second child answered'));

    await expect(answer.text()).resolves.toContain('the second child answered');
  });
});
