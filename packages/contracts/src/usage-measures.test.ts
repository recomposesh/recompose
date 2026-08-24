import { describe, expect, test } from 'vitest';

import type { LogRow } from './engine-logs';
import type { UsageMeasures } from './usage';

import {
  accruedMeasures,
  contextTierOf,
  emptyUsageMeasures,
  rowUsageTuple,
  summedUsageMeasures,
} from './usage-measures';

const servedAt = 1_754_600_000_000;

const clientKey = 'sha256:8706ee88bbbdda48d02a4888691822b90d8b136bc5fb8e3a815e518105f0655c';

const served: LogRow = {
  id: 'log-1',
  at: servedAt,
  gateway: 'relay',
  virtualModel: 'creative',
  origin: 'provider',
  method: 'POST',
  provider: 'anthropic',
  accountId: 'work',
  providerModel: 'claude-sonnet-4-5',
  status: 200,
  durationMs: 912,
  tokens: 1_820,
  usage: { input: 700, output: 900, cacheRead: 130, cacheWrite: 60, reasoning: 30 },
  clientKey,
};

const raisedByTheGateway: LogRow = {
  id: 'log-2',
  at: servedAt,
  gateway: 'relay',
  origin: 'gateway',
  method: 'POST',
  status: 502,
  clientKey,
  failure: 'The gateway could not reach the target.',
};

function aRowSized(prompt: Partial<NonNullable<LogRow['usage']>>): LogRow {
  return {
    ...served,
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, ...prompt },
  };
}

const alreadyHeld: UsageMeasures = {
  requests: 5,
  failed: 2,
  answered: 3,
  durationMsSum: 1_000,
  tokens: { input: 11, output: 13, cacheRead: 17, cacheWrite: 19, reasoning: 23, total: 83 },
};

describe('the measures a bucket opens at', () => {
  test('every count stands on zero', () => {
    expect(emptyUsageMeasures()).toEqual({
      requests: 0,
      failed: 0,
      answered: 0,
      durationMsSum: 0,
      tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 0 },
    });
  });
});

describe('one settled row accruing into held measures', () => {
  test('a served row adds itself to every measure it carries', () => {
    expect(accruedMeasures(alreadyHeld, served)).toEqual({
      requests: 6,
      failed: 2,
      answered: 4,
      durationMsSum: 1_912,
      tokens: {
        input: 711,
        output: 913,
        cacheRead: 147,
        cacheWrite: 79,
        reasoning: 53,
        total: 1_903,
      },
    });
  });

  test('a status of 399 stays on the served side of the failing line', () => {
    const almostFailing = { ...served, status: 399 };

    expect(accruedMeasures(alreadyHeld, almostFailing).failed).toBe(2);
  });

  test('a status of 400 counts as failed', () => {
    const failing = { ...served, status: 400 };

    expect(accruedMeasures(alreadyHeld, failing).failed).toBe(3);
  });

  test('a row without a duration never counts as answered', () => {
    const unanswered = { ...served, durationMs: undefined };

    const accrued = accruedMeasures(alreadyHeld, unanswered);

    expect(accrued.answered).toBe(3);
    expect(accrued.durationMsSum).toBe(1_000);
  });
});

describe('what a row without measurements accrues', () => {
  test('a split-less row accrues its total alone and moves no split field', () => {
    const withoutSplit: LogRow = { ...served, usage: undefined };

    expect(accruedMeasures(alreadyHeld, withoutSplit).tokens).toEqual({
      input: 11,
      output: 13,
      cacheRead: 17,
      cacheWrite: 19,
      reasoning: 23,
      total: 1_903,
    });
  });

  test('a gateway-raised failure counts one failed request and nothing else', () => {
    expect(accruedMeasures(emptyUsageMeasures(), raisedByTheGateway)).toEqual({
      requests: 1,
      failed: 1,
      answered: 0,
      durationMsSum: 0,
      tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 0 },
    });
  });
});

describe('two measure sets taken together', () => {
  test('every count and the whole split sum field by field', () => {
    const arriving: UsageMeasures = {
      requests: 100,
      failed: 200,
      answered: 300,
      durationMsSum: 400,
      tokens: {
        input: 1_000,
        output: 2_000,
        cacheRead: 3_000,
        cacheWrite: 4_000,
        reasoning: 5_000,
        total: 15_000,
      },
    };

    expect(summedUsageMeasures(alreadyHeld, arriving)).toEqual({
      requests: 105,
      failed: 202,
      answered: 303,
      durationMsSum: 1_400,
      tokens: {
        input: 1_011,
        output: 2_013,
        cacheRead: 3_017,
        cacheWrite: 4_019,
        reasoning: 5_023,
        total: 15_083,
      },
    });
  });
});

describe('the domain tuple one row accrues under', () => {
  test('a served row carries the whole hierarchy with its stamped kind', () => {
    expect(rowUsageTuple(served, 'api-key')).toEqual({
      gateway: 'relay',
      virtualModel: 'creative',
      provider: 'anthropic',
      providerModel: 'claude-sonnet-4-5',
      accountId: 'work',
      accountKind: 'api-key',
    });
  });

  test('a gateway-raised failure claims the gateway alone', () => {
    expect(rowUsageTuple(raisedByTheGateway, undefined)).toEqual({ gateway: 'relay' });
  });

  test('a fold without a kind stamps none, which is why the live plane never prices', () => {
    expect(rowUsageTuple(served)).toEqual({
      gateway: 'relay',
      virtualModel: 'creative',
      provider: 'anthropic',
      providerModel: 'claude-sonnet-4-5',
      accountId: 'work',
    });
  });
});

describe('the context tier one request fell in', () => {
  test('a prompt under every threshold the model publishes falls in no tier', () => {
    expect(contextTierOf(aRowSized({ input: 100_000 }), [200_000, 500_000])).toBeUndefined();
  });

  test('a prompt over one threshold names that threshold', () => {
    expect(contextTierOf(aRowSized({ input: 250_000 }), [200_000, 500_000])).toBe(200_000);
  });

  test('a prompt over two thresholds names the higher of them', () => {
    expect(contextTierOf(aRowSized({ input: 900_000 }), [200_000, 500_000])).toBe(500_000);
  });

  test('the prompt counts every token the model read, cached ones included', () => {
    const spread = aRowSized({ input: 100_000, cacheRead: 90_000, cacheWrite: 20_000 });

    expect(contextTierOf(spread, [200_000])).toBe(200_000);
  });

  test('what the model wrote back never counts toward the prompt it read', () => {
    const answered = aRowSized({ input: 150_000, output: 90_000, reasoning: 40_000 });

    expect(contextTierOf(answered, [200_000])).toBeUndefined();
  });

  test('a prompt sitting exactly on a threshold stays under it, the way a vendor quotes one', () => {
    expect(contextTierOf(aRowSized({ input: 200_000 }), [200_000])).toBeUndefined();
  });

  test('a model publishing no threshold puts every prompt in no tier', () => {
    expect(contextTierOf(aRowSized({ input: 5_000_000 }), [])).toBeUndefined();
  });

  test('a row that reported no tokens at all falls in no tier', () => {
    expect(contextTierOf({ ...aRowSized({}), usage: undefined }, [200_000])).toBeUndefined();
  });
});
