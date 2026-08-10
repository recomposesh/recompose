import type { LogBatch, LogRow } from '@recompose/contracts';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { LOGS_BACKFILL_CHUNK, LOGS_RETAINED_MAX, openLogsDesk } from './logs-ledger';
import { TRAFFIC_PUSH_MS } from './traffic-ledger';

const at = 1_754_600_000_000;

const clientKey = 'sha256:8706ee88bbbdda48d02a4888691822b90d8b136bc5fb8e3a815e518105f0655c';

function aRow(id: string): LogRow {
  return {
    id,
    at,
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
    clientKey,
  };
}

function loggedRequest(id: string): unknown {
  return { kind: 'log', row: aRow(id) };
}

function aDesk() {
  const pushed: LogBatch[] = [];

  return {
    pushed,
    desk: openLogsDesk((batch) => {
      pushed.push(batch);
    }),
  };
}

function batchesOfKind(pushed: readonly LogBatch[], kind: LogBatch['kind']): LogBatch[] {
  return pushed.filter((batch) => batch.kind === kind);
}

function idsIn(batches: readonly LogBatch[]): string[] {
  return batches.flatMap((batch) => batch.rows.map((row) => row.id));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('what the windows learn about logged requests', () => {
  test('a finished request reaches the windows as an appended run', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(loggedRequest('log-1'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([{ kind: 'append', rows: [aRow('log-1')] }]);
  });

  test('a busy gateway reaches the windows once per interval rather than once per request', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    for (const id of ['log-1', 'log-2', 'log-3']) {
      desk.hears(loggedRequest(id));
    }

    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toHaveLength(1);
    expect(idsIn(pushed)).toEqual(['log-1', 'log-2', 'log-3']);
  });

  test('nothing reaches the windows before the interval is up', () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(loggedRequest('log-1'));

    expect(pushed).toEqual([]);
  });

  test('a request after the interval has passed crosses on its own, without the run before it', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(loggedRequest('log-1'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);
    desk.hears(loggedRequest('log-2'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([
      { kind: 'append', rows: [aRow('log-1')] },
      { kind: 'append', rows: [aRow('log-2')] },
    ]);
  });
});

describe('what the desk refuses to hear', () => {
  test('a traffic report belongs to the cable lane, so the desk lets it pass', () => {
    const { pushed, desk } = aDesk();

    expect(
      desk.hears({
        kind: 'traffic',
        slug: 'relay',
        virtualModel: 'creative',
        request: { outcome: 'served', at },
      }),
    ).toBe(false);
    expect(pushed).toEqual([]);
  });

  test('a report the desk cannot read is not treated as a logged request', () => {
    const { desk } = aDesk();

    expect(desk.hears({ kind: 'log', row: { id: 'log-1' } })).toBe(false);
  });

  test('a log report the desk read is taken off the lane', () => {
    const { desk } = aDesk();

    expect(desk.hears(loggedRequest('log-1'))).toBe(true);
  });
});

describe('what a subscriber joining late reads first', () => {
  test('the requests already logged cross as backfill, and the stream appends after them', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(loggedRequest('log-1'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);
    desk.backfill();
    desk.hears(loggedRequest('log-2'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([
      { kind: 'append', rows: [aRow('log-1')] },
      { kind: 'backfill', rows: [aRow('log-1')] },
      { kind: 'append', rows: [aRow('log-2')] },
    ]);
  });

  test('a long history crosses in bounded runs rather than as one giant message', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();
    const logged = Array.from({ length: LOGS_BACKFILL_CHUNK * 2 + 1 }, (_row, index) =>
      String(index),
    );

    for (const id of logged) {
      desk.hears(loggedRequest(id));
    }

    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);
    desk.backfill();
    const backfilled = batchesOfKind(pushed, 'backfill');

    expect(backfilled).toHaveLength(3);
    expect(backfilled.map((batch) => batch.rows.length)).toEqual([
      LOGS_BACKFILL_CHUNK,
      LOGS_BACKFILL_CHUNK,
      1,
    ]);
    expect(idsIn(backfilled)).toEqual(logged);
  });

  test('a desk no request has reached yet greets a late subscriber with silence', () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.backfill();

    expect(pushed).toEqual([]);
  });

  test('a request still waiting to cross rides the backfill rather than appending behind it', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(loggedRequest('log-1'));
    desk.backfill();
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([{ kind: 'backfill', rows: [aRow('log-1')] }]);
  });
});

describe('how much history the desk keeps', () => {
  test('the oldest requests leave once the retained history is full', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    for (let index = 0; index <= LOGS_RETAINED_MAX; index += 1) {
      desk.hears(loggedRequest(String(index)));
    }

    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);
    desk.backfill();
    const backfilled = idsIn(batchesOfKind(pushed, 'backfill'));

    expect(backfilled).toHaveLength(LOGS_RETAINED_MAX);
    expect(backfilled.at(0)).toBe('1');
    expect(backfilled.at(-1)).toBe(String(LOGS_RETAINED_MAX));
  });
});
