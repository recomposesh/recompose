import type { GatewayBranchPins, GatewayCooldowns, RecomposeIpcEvents } from '@recompose/contracts';

import { gatewayCooldownsSchema } from '@recompose/contracts';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, test } from 'vitest';

import {
  bindEngineBranchPinsToCache,
  bindEngineCooldownsToCache,
  engineBranchPinsQueryOptions,
  engineCooldownsQueryOptions,
} from './engine';

function aCooldownLine(): {
  subscribe: RecomposeIpcEvents['engine:cooldowns'];
  push: (cooling: GatewayCooldowns) => void;
  listening: () => number;
} {
  const listeners = new Set<(cooling: GatewayCooldowns) => void>();

  return {
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    push: (cooling) => {
      for (const listener of listeners) {
        listener(cooling);
      }
    },
    listening: () => listeners.size,
  };
}

function aBranchPinLine(): {
  subscribe: RecomposeIpcEvents['engine:pins'];
  push: (pinning: GatewayBranchPins) => void;
} {
  const listeners = new Set<(pinning: GatewayBranchPins) => void>();

  return {
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    push: (pinning) => {
      for (const listener of listeners) {
        listener(pinning);
      }
    },
  };
}

const pinned: GatewayBranchPins = { codex: { fast: { ladder: { coder: 2 } } } };

const standingDown: GatewayCooldowns = { codex: { fast: { j1: 1_700_000_060_000 } } };

const standingLonger: GatewayCooldowns = { codex: { fast: { j1: 1_700_000_120_000 } } };

const underADottedAlias = gatewayCooldownsSchema.parse({
  codex: { 'claude-5.6-sol': { j1: 1_700_000_060_000 } },
});

function heldCooling(queryClient: QueryClient): GatewayCooldowns | undefined {
  return queryClient.getQueryData(engineCooldownsQueryOptions.queryKey);
}

describe('what the inspector reads about a node standing down', () => {
  test('a gateway nothing has refused yet reads as an empty snapshot', () => {
    expect(engineCooldownsQueryOptions.initialData).toEqual({});
  });

  test('a pushed snapshot is what the inspector reads next', () => {
    const queryClient = new QueryClient();
    const line = aCooldownLine();

    bindEngineCooldownsToCache(queryClient, line.subscribe);
    line.push(standingDown);

    expect(heldCooling(queryClient)).toEqual(standingDown);
  });

  test('a later push replaces the whole snapshot, so nothing has to be reconciled', () => {
    const queryClient = new QueryClient();
    const line = aCooldownLine();

    bindEngineCooldownsToCache(queryClient, line.subscribe);
    line.push(standingDown);
    line.push(standingLonger);

    expect(heldCooling(queryClient)).toEqual(standingLonger);
  });

  test('letting go stops the listening, so no binding outlives its screen', () => {
    const queryClient = new QueryClient();
    const line = aCooldownLine();

    const letGo = bindEngineCooldownsToCache(queryClient, line.subscribe);

    expect(line.listening()).toBe(1);

    letGo();

    expect(line.listening()).toBe(0);
  });

  test('a pin push leaves the cooling standing, so neither lane clears the other', () => {
    const queryClient = new QueryClient();
    const cooldowns = aCooldownLine();
    const pins = aBranchPinLine();

    bindEngineCooldownsToCache(queryClient, cooldowns.subscribe);
    bindEngineBranchPinsToCache(queryClient, pins.subscribe);
    cooldowns.push(standingDown);
    pins.push(pinned);

    expect(heldCooling(queryClient)).toEqual(standingDown);
    expect(queryClient.getQueryData(engineBranchPinsQueryOptions.queryKey)).toEqual(pinned);
  });

  test('a virtual model whose alias carries a dot reaches the inspector under that alias', () => {
    const queryClient = new QueryClient();
    const line = aCooldownLine();

    bindEngineCooldownsToCache(queryClient, line.subscribe);
    line.push(underADottedAlias);

    expect(heldCooling(queryClient)).toEqual(underADottedAlias);
  });
});
