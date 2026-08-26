import type { GatewayTraffic, RecomposeIpcEvents } from '@recompose/contracts';

import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { bindEngineTrafficToCache, engineTrafficQueryOptions } from './engine';

function aTrafficLine(): {
  subscribe: RecomposeIpcEvents['engine:traffic'];
  push: (traffic: GatewayTraffic) => void;
  listening: () => number;
} {
  const listeners = new Set<(traffic: GatewayTraffic) => void>();

  return {
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    push: (traffic) => {
      for (const listener of listeners) {
        listener(traffic);
      }
    },
    listening: () => listeners.size,
  };
}

const flowed: GatewayTraffic = {
  codex: { fast: { only: { outcome: 'served', at: 1_754_600_000_000 } } },
};

const inFlight: GatewayTraffic = {
  codex: { fast: { only: { outcome: 'live', at: 1_754_600_000_002 } } },
};

const wentRed: GatewayTraffic = {
  codex: {
    fast: {
      only: {
        outcome: 'failed',
        at: 1_754_600_000_001,
        status: 502,
        detail: 'The gateway could not reach the target.',
      },
    },
  },
};

function aSnapshotAsk(): {
  ask: () => Promise<{ ok: true; value: undefined }>;
  asked: () => number;
} {
  const calls = { times: 0 };

  return {
    ask: async () => {
      calls.times += 1;

      return Promise.resolve({ ok: true as const, value: undefined });
    },
    asked: () => calls.times,
  };
}

function heldTraffic(queryClient: QueryClient): GatewayTraffic | undefined {
  return queryClient.getQueryData(engineTrafficQueryOptions.queryKey);
}

describe('what the canvas reads about traffic', () => {
  test('a gateway nothing has flowed through yet reads as an empty snapshot', () => {
    expect(engineTrafficQueryOptions.initialData).toEqual({});
  });

  test('a pushed snapshot is what the canvas reads next', () => {
    const queryClient = new QueryClient();
    const line = aTrafficLine();

    bindEngineTrafficToCache(queryClient, line.subscribe, aSnapshotAsk().ask);
    line.push(flowed);

    expect(heldTraffic(queryClient)).toEqual(flowed);
  });

  test('a later push replaces the whole snapshot, so nothing has to be reconciled', () => {
    const queryClient = new QueryClient();
    const line = aTrafficLine();

    bindEngineTrafficToCache(queryClient, line.subscribe, aSnapshotAsk().ask);
    line.push(flowed);
    line.push(wentRed);

    expect(heldTraffic(queryClient)).toEqual(wentRed);
  });

  test('letting go stops the listening, so no binding outlives its screen', () => {
    const queryClient = new QueryClient();
    const line = aTrafficLine();

    const letGo = bindEngineTrafficToCache(queryClient, line.subscribe, aSnapshotAsk().ask);

    expect(line.listening()).toBe(1);

    letGo();

    expect(line.listening()).toBe(0);
  });

  test('traffic is held apart from the lifecycle states, so neither push clears the other', () => {
    expect(engineTrafficQueryOptions.queryKey).not.toEqual(['engine-states']);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a window that binds while a request is already in flight', () => {
  test('binding asks main for the snapshot, because a fresh renderer holds nothing', () => {
    const asking = aSnapshotAsk();

    bindEngineTrafficToCache(new QueryClient(), aTrafficLine().subscribe, asking.ask);

    expect(asking.asked()).toBe(1);
  });

  test('a request already in flight reaches the cache on the answering push', () => {
    const queryClient = new QueryClient();
    const line = aTrafficLine();

    bindEngineTrafficToCache(queryClient, line.subscribe, aSnapshotAsk().ask);
    line.push(inFlight);

    expect(heldTraffic(queryClient)).toEqual(inFlight);
  });

  test('a second window asks again, because each push carries the whole snapshot', () => {
    const queryClient = new QueryClient();
    const line = aTrafficLine();
    const asking = aSnapshotAsk();

    const letGo = bindEngineTrafficToCache(queryClient, line.subscribe, asking.ask);

    letGo();
    bindEngineTrafficToCache(queryClient, line.subscribe, asking.ask);

    expect(asking.asked()).toBe(2);
  });

  test('an ask main refuses is complained about rather than thrown', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    bindEngineTrafficToCache(new QueryClient(), aTrafficLine().subscribe, async () =>
      Promise.resolve({
        ok: false as const,
        error: { code: 'storage-failed' as const, message: 'the desk is gone' },
      }),
    );

    await expect.poll(() => complaint.mock.calls.length).toBe(1);
    expect(complaint.mock.calls[0]?.[1]).toEqual({
      code: 'storage-failed',
      message: 'the desk is gone',
    });
  });

  test('an ask that breaks in transit is complained about rather than thrown', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const bridgeGone = new Error('the bridge is gone');

    bindEngineTrafficToCache(new QueryClient(), aTrafficLine().subscribe, async () =>
      Promise.reject(bridgeGone),
    );

    await expect.poll(() => complaint.mock.calls.length).toBe(1);
    expect(complaint.mock.calls[0]?.[1]).toBe(bridgeGone);
  });
});
