import type { LogBatch, LogRow, RecomposeIpcEvents } from '@recompose/contracts';

import { QueryClient } from '@tanstack/react-query';
import { expect, test } from 'vitest';

import { bindEngineLogsToCache, engineLogsQueryOptions } from './engine-logs';

function aLogLine(): {
  subscribe: RecomposeIpcEvents['engine:logs'];
  push: (batch: LogBatch) => void;
  listening: () => number;
} {
  const listeners = new Set<(batch: LogBatch) => void>();

  return {
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    push: (batch) => {
      for (const listener of listeners) {
        listener(batch);
      }
    },
    listening: () => listeners.size,
  };
}

const FIRST_INSTANT = 1_754_600_000_000;

const someClient = `sha256:${'a'.repeat(64)}`;

function aRow(id: string, at: number, gateway = 'codex'): LogRow {
  return {
    id,
    at,
    gateway,
    virtualModel: 'fast',
    origin: 'provider',
    method: 'POST',
    provider: 'anthropic',
    providerModel: 'claude-sonnet-4',
    status: 200,
    durationMs: 412,
    tokens: 1_200,
    clientKey: someClient,
  };
}

function aRun(count: number, from: number): readonly LogRow[] {
  return Array.from({ length: count }, (_unused, step) =>
    aRow(`row-${from + step}`, FIRST_INSTANT + from + step),
  );
}

function heldRows(queryClient: QueryClient, slug: string): readonly LogRow[] {
  return queryClient.getQueryData(engineLogsQueryOptions(slug).queryKey) ?? [];
}

function idsHeld(queryClient: QueryClient, slug: string): readonly string[] {
  return heldRows(queryClient, slug).map((row) => row.id);
}

function aBoundCache(subscribe: RecomposeIpcEvents['engine:logs']): QueryClient {
  const queryClient = new QueryClient();

  bindEngineLogsToCache(queryClient, subscribe);

  return queryClient;
}

test('a gateway nothing has served yet reads as no rows rather than as loading', () => {
  expect(engineLogsQueryOptions('codex').initialData).toEqual([]);
});

test('each gateway is read under its own key, so one gateway never reads another', () => {
  expect(engineLogsQueryOptions('codex').queryKey).not.toEqual(
    engineLogsQueryOptions('claude').queryKey,
  );
});

test('a pushed batch is what the drawer reads next', () => {
  const line = aLogLine();
  const queryClient = aBoundCache(line.subscribe);

  line.push({ kind: 'append', rows: [aRow('one', FIRST_INSTANT)] });

  expect(idsHeld(queryClient, 'codex')).toEqual(['one']);
});

test('an append adds to the rows already held rather than replacing them', () => {
  const line = aLogLine();
  const queryClient = aBoundCache(line.subscribe);

  line.push({ kind: 'append', rows: [aRow('one', FIRST_INSTANT)] });
  line.push({ kind: 'append', rows: [aRow('two', FIRST_INSTANT + 1)] });

  expect(idsHeld(queryClient, 'codex')).toEqual(['two', 'one']);
});

test('a backfill merges under the rows a person is reading, so nothing they saw leaves', () => {
  const line = aLogLine();
  const queryClient = aBoundCache(line.subscribe);

  line.push({ kind: 'append', rows: [aRow('two', FIRST_INSTANT + 1)] });
  line.push({ kind: 'backfill', rows: [aRow('one', FIRST_INSTANT)] });

  expect(idsHeld(queryClient, 'codex')).toEqual(['two', 'one']);
});

test('a row delivered twice lands once, so a backfill after an append never doubles a row', () => {
  const line = aLogLine();
  const queryClient = aBoundCache(line.subscribe);

  line.push({ kind: 'append', rows: [aRow('one', FIRST_INSTANT)] });
  line.push({
    kind: 'backfill',
    rows: [aRow('one', FIRST_INSTANT), aRow('two', FIRST_INSTANT + 1)],
  });

  expect(idsHeld(queryClient, 'codex')).toEqual(['two', 'one']);
});

test('the newest row stands first, whichever order the batches arrived in', () => {
  const line = aLogLine();
  const queryClient = aBoundCache(line.subscribe);

  line.push({ kind: 'append', rows: [aRow('middle', FIRST_INSTANT + 1)] });
  line.push({
    kind: 'backfill',
    rows: [aRow('newest', FIRST_INSTANT + 2), aRow('oldest', FIRST_INSTANT)],
  });

  expect(idsHeld(queryClient, 'codex')).toEqual(['newest', 'middle', 'oldest']);
});

test('rows sharing an instant hold one order, so a merge never shuffles what stands', () => {
  const line = aLogLine();
  const queryClient = aBoundCache(line.subscribe);

  line.push({ kind: 'append', rows: [aRow('b', FIRST_INSTANT), aRow('a', FIRST_INSTANT)] });
  const first = idsHeld(queryClient, 'codex');

  line.push({ kind: 'backfill', rows: [aRow('a', FIRST_INSTANT), aRow('b', FIRST_INSTANT)] });

  expect(idsHeld(queryClient, 'codex')).toEqual(first);
});

test('the ten thousand newest rows stand and the oldest leave, as the ring buffer does', () => {
  const line = aLogLine();
  const queryClient = aBoundCache(line.subscribe);

  line.push({ kind: 'append', rows: aRun(6_000, 0) });
  line.push({ kind: 'append', rows: aRun(6_000, 6_000) });

  const held = heldRows(queryClient, 'codex');

  expect(held).toHaveLength(10_000);
  expect(held.at(0)?.id).toBe('row-11999');
  expect(held.at(-1)?.id).toBe('row-2000');
});

test('a batch carrying two gateways files each row under the gateway that served it', () => {
  const line = aLogLine();
  const queryClient = aBoundCache(line.subscribe);

  line.push({
    kind: 'append',
    rows: [aRow('one', FIRST_INSTANT, 'codex'), aRow('two', FIRST_INSTANT + 1, 'claude')],
  });

  expect(idsHeld(queryClient, 'codex')).toEqual(['one']);
  expect(idsHeld(queryClient, 'claude')).toEqual(['two']);
});

test('a batch holding no row leaves the held rows alone', () => {
  const line = aLogLine();
  const queryClient = aBoundCache(line.subscribe);

  line.push({ kind: 'append', rows: [aRow('one', FIRST_INSTANT)] });
  line.push({ kind: 'backfill', rows: [] });

  expect(idsHeld(queryClient, 'codex')).toEqual(['one']);
});

test('letting go stops the listening, so no binding outlives its screen', () => {
  const queryClient = new QueryClient();
  const line = aLogLine();

  const letGo = bindEngineLogsToCache(queryClient, line.subscribe);

  expect(line.listening()).toBe(1);

  letGo();

  expect(line.listening()).toBe(0);
});
