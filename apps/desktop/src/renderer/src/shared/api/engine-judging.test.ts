import type { GatewayCooldowns, GatewayJudging, RecomposeIpcEvents } from '@recompose/contracts';

import { QueryClient } from '@tanstack/react-query';
import { describe, expect, test } from 'vitest';

import {
  bindEngineCooldownsToCache,
  bindEngineJudgingToCache,
  engineCooldownsQueryOptions,
  engineJudgingQueryOptions,
} from './engine';

function aJudgingLine(): {
  subscribe: RecomposeIpcEvents['engine:judging'];
  push: (judging: GatewayJudging) => void;
  listening: () => number;
} {
  const listeners = new Set<(judging: GatewayJudging) => void>();

  return {
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    push: (judging) => {
      for (const listener of listeners) {
        listener(judging);
      }
    },
    listening: () => listeners.size,
  };
}

const judging: GatewayJudging = { codex: { fast: { ladder: 1 } } };

const settled: GatewayJudging = { codex: { fast: { ladder: 0 } } };

const standingDown: GatewayCooldowns = { codex: { fast: { j1: 1_700_000_060_000 } } };

function heldJudging(queryClient: QueryClient): GatewayJudging | undefined {
  return queryClient.getQueryData(engineJudgingQueryOptions.queryKey);
}

describe('what the canvas reads about a router waiting on its judge', () => {
  test('a canvas nothing is judging on reads as an empty snapshot', () => {
    expect(engineJudgingQueryOptions.initialData).toEqual({});
  });

  test('a pushed snapshot is what the canvas reads next', () => {
    const queryClient = new QueryClient();
    const line = aJudgingLine();

    bindEngineJudgingToCache(queryClient, line.subscribe);
    line.push(judging);

    expect(heldJudging(queryClient)).toEqual(judging);
  });

  test('a later push replaces the whole snapshot, so a settled router stops pulsing', () => {
    const queryClient = new QueryClient();
    const line = aJudgingLine();

    bindEngineJudgingToCache(queryClient, line.subscribe);
    line.push(judging);
    line.push(settled);

    expect(heldJudging(queryClient)).toEqual(settled);
  });

  test('letting go stops the listening, so no binding outlives its screen', () => {
    const queryClient = new QueryClient();
    const line = aJudgingLine();
    const letGo = bindEngineJudgingToCache(queryClient, line.subscribe);

    expect(line.listening()).toBe(1);

    letGo();

    expect(line.listening()).toBe(0);
  });

  test('a cooldown push leaves the judging standing, so neither lane clears the other', () => {
    const queryClient = new QueryClient();
    const line = aJudgingLine();
    const cooling: RecomposeIpcEvents['engine:cooldowns'] = (listener) => {
      listener(standingDown);

      return () => undefined;
    };

    bindEngineJudgingToCache(queryClient, line.subscribe);
    line.push(judging);
    bindEngineCooldownsToCache(queryClient, cooling);

    expect(heldJudging(queryClient)).toEqual(judging);
    expect(queryClient.getQueryData(engineCooldownsQueryOptions.queryKey)).toEqual(standingDown);
  });
});
