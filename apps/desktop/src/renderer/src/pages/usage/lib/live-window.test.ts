import type { LogRow } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import { liveWindowFold } from './live-window';

const NOW = 1_755_000_000_000;
const MINUTE_MS = 60_000;

const servedBase: LogRow = {
  id: 'row-1',
  at: NOW - MINUTE_MS,
  gateway: 'relay',
  origin: 'provider',
  method: 'POST /v1/messages',
  status: 200,
  durationMs: 850,
  tokens: 60,
  usage: { input: 30, output: 20, cacheRead: 10, cacheWrite: 0, reasoning: 0 },
  clientKey: 'claude-code',
};

function servedRow(overrides: Partial<LogRow> = {}): LogRow {
  return { ...servedBase, ...overrides };
}

function inFlightRow(): LogRow {
  return {
    id: 'row-open',
    at: NOW - MINUTE_MS,
    gateway: 'relay',
    origin: 'provider',
    method: 'POST /v1/messages',
    status: 200,
    clientKey: 'claude-code',
  };
}

describe('given one served request inside the trailing hour', () => {
  it('folds it into its minute bucket with the tuple and the split', () => {
    const at = NOW - 5 * MINUTE_MS + 250;
    const folded = liveWindowFold([servedRow({ at, virtualModel: 'creative' })], NOW);

    expect(folded).toEqual([
      {
        start: at - (at % MINUTE_MS),
        tuple: { gateway: 'relay', virtualModel: 'creative' },
        measures: {
          requests: 1,
          failed: 0,
          answered: 1,
          durationMsSum: 850,
          tokens: { input: 30, output: 20, cacheRead: 10, cacheWrite: 0, reasoning: 0, total: 60 },
        },
      },
    ]);
  });
});

describe('given rows the live plane must not count', () => {
  it('leaves rows older than the trailing hour out', () => {
    const folded = liveWindowFold([servedRow({ at: NOW - 61 * MINUTE_MS })], NOW);

    expect(folded).toEqual([]);
  });

  it('leaves a provider response still in flight out', () => {
    expect(liveWindowFold([inFlightRow()], NOW)).toEqual([]);
  });
});

describe('given a failed request', () => {
  it('counts it as failed while still counting the request', () => {
    const folded = liveWindowFold([servedRow({ status: 502, durationMs: 120, tokens: 0 })], NOW);

    expect(folded[0]?.measures.requests).toBe(1);
    expect(folded[0]?.measures.failed).toBe(1);
  });
});

describe('given traffic through two tuples in the same minute', () => {
  it('keeps one bucket per tuple and merges rows sharing a tuple', () => {
    const at = NOW - 2 * MINUTE_MS;
    const folded = liveWindowFold(
      [
        servedRow({ id: 'a', at, virtualModel: 'creative' }),
        servedRow({ id: 'b', at: at + 100, virtualModel: 'creative' }),
        servedRow({ id: 'c', at: at + 200, virtualModel: 'fast' }),
      ],
      NOW,
    );

    expect(folded).toHaveLength(2);
    expect(
      folded.find((bucket) => bucket.tuple.virtualModel === 'creative')?.measures.requests,
    ).toBe(2);
    expect(folded.find((bucket) => bucket.tuple.virtualModel === 'fast')?.measures.requests).toBe(
      1,
    );
  });
});

describe('the fold answers oldest first', () => {
  it('orders buckets by their minute start', () => {
    const olderAt = NOW - 10 * MINUTE_MS;
    const newerAt = NOW - MINUTE_MS;
    const folded = liveWindowFold(
      [servedRow({ id: 'newer', at: newerAt }), servedRow({ id: 'older', at: olderAt })],
      NOW,
    );

    expect(folded.map((bucket) => bucket.start)).toEqual([
      olderAt - (olderAt % MINUTE_MS),
      newerAt - (newerAt % MINUTE_MS),
    ]);
  });
});
