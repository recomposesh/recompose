import type { LogBatch, LogRow } from '@recompose/contracts';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { openLogsDesk } from './logs-ledger';
import { TRAFFIC_PUSH_MS } from './traffic-ledger';

const at = 1_754_600_000_000;

const stoppedAt = at + 5_000;

const clientKey = 'sha256:8706ee88bbbdda48d02a4888691822b90d8b136bc5fb8e3a815e518105f0655c';

function anUnfinishedRow(id: string, gateway = 'relay'): LogRow {
  return {
    id,
    at,
    gateway,
    virtualModel: 'creative',
    origin: 'provider',
    method: 'POST',
    provider: 'anthropic',
    accountId: 'work',
    providerModel: 'claude-sonnet-4-5',
    status: 200,
    tokens: 1_820,
    clientKey,
  };
}

function aFinishedRow(id: string, gateway = 'relay'): LogRow {
  return { ...anUnfinishedRow(id, gateway), durationMs: 912 };
}

function logged(row: LogRow): unknown {
  return { kind: 'log', row };
}

function interruptedVersionOf(row: LogRow): LogRow {
  return {
    ...row,
    status: 503,
    durationMs: stoppedAt - at,
    failure: 'The gateway stopped before the request finished.',
  };
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

afterEach(() => {
  vi.useRealTimers();
});

describe('a gateway that stopped while requests were unfinished', () => {
  test('an unfinished request reads failed with the time it had been running', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(logged(anUnfinishedRow('log-1')));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    vi.setSystemTime(stoppedAt);
    desk.interrupt('relay');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({
      kind: 'append',
      rows: [interruptedVersionOf(anUnfinishedRow('log-1'))],
    });
  });

  test('a request that finished keeps the record it earned', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(logged(aFinishedRow('log-1')));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    desk.interrupt('relay');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([{ kind: 'append', rows: [aFinishedRow('log-1')] }]);
  });

  test('a row the gateway itself raised stays as it was written', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(logged({ ...anUnfinishedRow('log-1'), origin: 'gateway' }));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    desk.interrupt('relay');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toHaveLength(1);
  });

  test("another gateway's unfinished requests keep running", async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(logged(anUnfinishedRow('log-1', 'spare')));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    desk.interrupt('relay');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toHaveLength(1);
  });
});

describe('the history once a gateway has stopped', () => {
  test('the interruption is what a subscriber joining later reads', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(logged(anUnfinishedRow('log-1')));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    vi.setSystemTime(stoppedAt);
    desk.interrupt('relay');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);
    desk.backfill();

    expect(pushed.at(-1)).toEqual({
      kind: 'backfill',
      rows: [interruptedVersionOf(anUnfinishedRow('log-1'))],
    });
  });

  test('a report after the stop is taken off the lane but never crosses', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.interrupt('relay');

    expect(desk.hears(logged(aFinishedRow('log-1')))).toBe(true);

    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([]);
  });

  test('a gateway serving again is heard like new', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.interrupt('relay');
    desk.resume('relay');
    desk.hears(logged(aFinishedRow('log-1')));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([{ kind: 'append', rows: [aFinishedRow('log-1')] }]);
  });
});

describe('a gateway removed from the log history', () => {
  test('its history leaves with it', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(logged(aFinishedRow('log-1')));
    desk.hears(logged(aFinishedRow('log-2', 'spare')));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    desk.forget('relay');
    desk.backfill();

    expect(pushed.at(-1)).toEqual({ kind: 'backfill', rows: [aFinishedRow('log-2', 'spare')] });
  });

  test('a row still waiting to cross leaves with it', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(logged(aFinishedRow('log-1')));
    desk.hears(logged(aFinishedRow('log-2', 'spare')));
    desk.forget('relay');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([{ kind: 'append', rows: [aFinishedRow('log-2', 'spare')] }]);
  });

  test('a removed gateway that returns is heard like new', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.interrupt('relay');
    desk.forget('relay');
    desk.hears(logged(aFinishedRow('log-9')));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([{ kind: 'append', rows: [aFinishedRow('log-9')] }]);
  });
});
