import type { GatewayTraffic, RecomposeIpcEvents } from '@recompose/contracts';

import { QueryClient } from '@tanstack/react-query';
import { describe, expect, test } from 'vitest';

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

const flowed: GatewayTraffic = { codex: { fast: { outcome: 'served', at: 1_754_600_000_000 } } };

const wentRed: GatewayTraffic = {
  codex: {
    fast: {
      outcome: 'failed',
      at: 1_754_600_000_001,
      status: 502,
      detail: 'The gateway could not reach the target.',
    },
  },
};

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

    bindEngineTrafficToCache(queryClient, line.subscribe);
    line.push(flowed);

    expect(heldTraffic(queryClient)).toEqual(flowed);
  });

  test('a later push replaces the whole snapshot, so nothing has to be reconciled', () => {
    const queryClient = new QueryClient();
    const line = aTrafficLine();

    bindEngineTrafficToCache(queryClient, line.subscribe);
    line.push(flowed);
    line.push(wentRed);

    expect(heldTraffic(queryClient)).toEqual(wentRed);
  });

  test('letting go stops the listening, so no binding outlives its screen', () => {
    const queryClient = new QueryClient();
    const line = aTrafficLine();

    const letGo = bindEngineTrafficToCache(queryClient, line.subscribe);

    expect(line.listening()).toBe(1);

    letGo();

    expect(line.listening()).toBe(0);
  });

  test('traffic is held apart from the lifecycle states, so neither push clears the other', () => {
    expect(engineTrafficQueryOptions.queryKey).not.toEqual(['engine-states']);
  });
});
