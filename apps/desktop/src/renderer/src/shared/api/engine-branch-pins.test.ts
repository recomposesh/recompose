import type { GatewayBranchPins, RecomposeIpcEvents } from '@recompose/contracts';

import { gatewayBranchPinsSchema } from '@recompose/contracts';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, test } from 'vitest';

import { bindEngineBranchPinsToCache, engineBranchPinsQueryOptions } from './engine';

function aBranchPinLine(): {
  subscribe: RecomposeIpcEvents['engine:pins'];
  push: (pinning: GatewayBranchPins) => void;
  listening: () => number;
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
    listening: () => listeners.size,
  };
}

const holding: GatewayBranchPins = { codex: { fast: { ladder: { coder: 2 } } } };

const movedOn: GatewayBranchPins = { codex: { fast: { ladder: { coder: 1, talker: 2 } } } };

const underADottedAlias = gatewayBranchPinsSchema.parse({
  codex: { 'claude-5.6-sol': { ladder: { coder: 2 } } },
});

function heldPins(queryClient: QueryClient): GatewayBranchPins | undefined {
  return queryClient.getQueryData(engineBranchPinsQueryOptions.queryKey);
}

describe('what the inspector reads about pinned conversations', () => {
  test('a router nothing has judged through yet reads as an empty snapshot', () => {
    expect(engineBranchPinsQueryOptions.initialData).toEqual({});
  });

  test('a pushed snapshot is what the inspector reads next', () => {
    const queryClient = new QueryClient();
    const line = aBranchPinLine();

    bindEngineBranchPinsToCache(queryClient, line.subscribe);
    line.push(holding);

    expect(heldPins(queryClient)).toEqual(holding);
  });

  test('a later push replaces the whole snapshot, so nothing has to be reconciled', () => {
    const queryClient = new QueryClient();
    const line = aBranchPinLine();

    bindEngineBranchPinsToCache(queryClient, line.subscribe);
    line.push(holding);
    line.push(movedOn);

    expect(heldPins(queryClient)).toEqual(movedOn);
  });

  test('letting go stops the listening, so no binding outlives its screen', () => {
    const queryClient = new QueryClient();
    const line = aBranchPinLine();

    const letGo = bindEngineBranchPinsToCache(queryClient, line.subscribe);

    expect(line.listening()).toBe(1);

    letGo();

    expect(line.listening()).toBe(0);
  });

  test('pins are held apart from traffic, so neither push clears the other', () => {
    expect(engineBranchPinsQueryOptions.queryKey).not.toEqual(['engine-traffic']);
  });

  test('a virtual model whose alias carries a dot reaches the inspector under that alias', () => {
    const queryClient = new QueryClient();
    const line = aBranchPinLine();

    bindEngineBranchPinsToCache(queryClient, line.subscribe);
    line.push(underADottedAlias);

    expect(heldPins(queryClient)).toEqual(underADottedAlias);
  });
});
