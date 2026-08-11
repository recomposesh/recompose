import type { LogRow } from '@recompose/contracts';

import { fc, test as propertyTest } from '@fast-check/vitest';
import { expect, test } from 'vitest';

import { trafficAggregates } from './traffic-aggregates';

const NOW = 1_760_000_000_000;
const MINUTE = 60_000;

function hashedKey(mark: string): string {
  return `sha256:${mark.repeat(64)}`;
}

const FIRST_CLIENT = hashedKey('a');
const SECOND_CLIENT = hashedKey('b');

type RowStanding = {
  at: number;
  status?: number;
  tokens?: number;
  durationMs?: number;
  clientKey?: string;
};

function row(id: string, standing: RowStanding): LogRow {
  const { at, status = 200, clientKey = FIRST_CLIENT, durationMs = 12, ...spent } = standing;

  return {
    id,
    at,
    gateway: 'main',
    origin: 'provider',
    method: 'POST',
    status,
    durationMs,
    clientKey,
    ...spent,
  };
}

const anyRow = fc
  .record(
    {
      id: fc.string({ minLength: 1 }),
      at: fc.integer({ min: NOW - 2 * MINUTE, max: NOW + 1_000 }),
      status: fc.integer({ min: 100, max: 599 }),
      tokens: fc.integer({ min: 0, max: 5_000 }),
      durationMs: fc.integer({ min: 0, max: 10_000 }),
      clientKey: fc.constantFrom(FIRST_CLIENT, SECOND_CLIENT, hashedKey('c')),
    },
    { requiredKeys: ['id', 'at', 'status', 'clientKey'] },
  )
  .map(({ id, ...standing }) => row(id, standing));

const anyInstant = fc.integer({ min: NOW - MINUTE, max: NOW + MINUTE });

const quiet = { requestsPerMinute: 0, tokensPerMinute: 0, clientApps: 0, errors: 0, p95Ms: 0 };

function sortedSelection(samples: readonly number[]): number {
  const qualifying = samples.filter(
    (sample) => samples.filter((other) => other <= sample).length * 20 >= samples.length * 19,
  );

  return qualifying.length === 0 ? 0 : Math.min(...qualifying);
}

function durationsWithin(rows: readonly LogRow[], now: number): readonly number[] {
  return rows
    .filter((held) => now - held.at < MINUTE)
    .flatMap((held) => (held.durationMs === undefined ? [] : [held.durationMs]));
}

test('a gateway no client app has called yet reads zeros across the whole strip', () => {
  expect(trafficAggregates([], NOW)).toEqual(quiet);
});

test('requests older than the minute decay out of every reading', () => {
  const stale = [row('stale', { at: NOW - MINUTE - 1, tokens: 900, durationMs: 40 })];

  expect(trafficAggregates(stale, NOW)).toEqual(quiet);
});

test('a request a millisecond inside the minute still counts', () => {
  const arrival = [row('arrival', { at: NOW - MINUTE + 1 })];

  expect(trafficAggregates(arrival, NOW).requestsPerMinute).toBe(1);
});

test('a request stamped a moment ahead of the clock counts rather than vanishing', () => {
  const ahead = [row('ahead', { at: NOW + 5 })];

  expect(trafficAggregates(ahead, NOW).requestsPerMinute).toBe(1);
});

test('the strip counts every request the last minute holds', () => {
  const served = [
    row('first', { at: NOW - 30_000 }),
    row('second', { at: NOW - 10_000 }),
    row('third', { at: NOW }),
  ];

  expect(trafficAggregates(served, NOW).requestsPerMinute).toBe(3);
});

test('tokens add up across the window, and a request carrying none adds nothing', () => {
  const served = [
    row('counted', { at: NOW - 20_000, tokens: 1_200 }),
    row('uncounted', { at: NOW - 10_000 }),
    row('also-counted', { at: NOW, tokens: 800 }),
    row('spent-long-ago', { at: NOW - MINUTE, tokens: 99_000 }),
  ];

  expect(trafficAggregates(served, NOW).tokensPerMinute).toBe(2_000);
});

test('a client app that called many times still counts as one client app', () => {
  const served = [
    row('first-call', { at: NOW - 20_000, clientKey: FIRST_CLIENT }),
    row('second-call', { at: NOW - 10_000, clientKey: FIRST_CLIENT }),
    row('another-app', { at: NOW, clientKey: SECOND_CLIENT }),
  ];

  expect(trafficAggregates(served, NOW).clientApps).toBe(2);
});

test('a request answered at 400 counts as an error and one answered at 399 does not', () => {
  const served = [
    row('refused', { at: NOW - 1_000, status: 400 }),
    row('redirected', { at: NOW, status: 399 }),
  ];

  expect(trafficAggregates(served, NOW).errors).toBe(1);
});

test('the p95 selects an exact sample from the window rather than an estimate', () => {
  const served = Array.from({ length: 20 }, (_, index) =>
    row(`answered-${String(index)}`, { at: NOW - index, durationMs: index + 1 }),
  );

  expect(trafficAggregates(served, NOW).p95Ms).toBe(19);
});

test('the p95 reads the same sample however the requests arrived', () => {
  const slowestFirst = Array.from({ length: 20 }, (_, index) =>
    row(`answered-${String(index)}`, { at: NOW - index, durationMs: 20 - index }),
  );

  expect(trafficAggregates(slowestFirst, NOW).p95Ms).toBe(19);
});

test('a request answered beside a failed one still gives the p95 the duration it has', () => {
  const served = [
    row('answered', { at: NOW - 1_000, durationMs: 900 }),
    row('failed', { at: NOW, status: 502 }),
  ];

  expect(trafficAggregates(served, NOW).p95Ms).toBe(900);
});

function stillInFlight(logged: LogRow): LogRow {
  const { durationMs: _stillRunning, ...rest } = logged;

  return rest;
}

test('a request still in flight carries no duration and never drags the p95 down', () => {
  const answered = Array.from({ length: 19 }, (_, index) =>
    row(`answered-${String(index)}`, { at: NOW - index, durationMs: index + 1 }),
  );
  const running = stillInFlight(row('running', { at: NOW }));

  expect(trafficAggregates([...answered, running], NOW).p95Ms).toBe(19);
});

test('a minute of requests still in flight leaves the p95 reading nothing at all', () => {
  const served = [
    stillInFlight(row('first-running', { at: NOW - 5_000 })),
    stillInFlight(row('second-running', { at: NOW })),
  ];

  expect(trafficAggregates(served, NOW).p95Ms).toBe(0);
});

propertyTest.prop([fc.array(anyRow, { maxLength: 40 }), anyInstant])(
  'every count reads what a plain filter over the last minute reads',
  (rows, now) => {
    const held = rows.filter((request) => now - request.at < MINUTE);
    const reading = trafficAggregates(rows, now);

    expect(reading.requestsPerMinute).toBe(held.length);
    expect(reading.tokensPerMinute).toBe(held.reduce((sum, one) => sum + (one.tokens ?? 0), 0));
    expect(reading.clientApps).toBe(new Set(held.map((one) => one.clientKey)).size);
    expect(reading.errors).toBe(
      held.filter((one) => one.durationMs !== undefined && one.status >= 400).length,
    );
  },
);

propertyTest.prop([fc.array(anyRow, { maxLength: 40 }), anyInstant])(
  'the p95 reads the same sample a sorted selection over the window reads',
  (rows, now) => {
    expect(trafficAggregates(rows, now).p95Ms).toBe(sortedSelection(durationsWithin(rows, now)));
  },
);

propertyTest.prop([anyRow])('a request exactly a minute back has left the window', (arrival) => {
  expect(trafficAggregates([{ ...arrival, at: NOW - MINUTE }], NOW)).toEqual(quiet);
});

propertyTest.prop([fc.array(anyRow, { maxLength: 40 }), anyInstant])(
  'every reading stays at zero or above, whatever the window holds',
  (rows, now) => {
    const readings = Object.values(trafficAggregates(rows, now));

    expect(readings.every((reading) => reading >= 0)).toBe(true);
  },
);
