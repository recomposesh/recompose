import type { EngineGateway, LogBatch, LogRow } from '@recompose/contracts';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { createEngineHost } from './engine-host';
import { grantsNothing, running, scriptedChild } from './engine-host.testkit';
import { TRAFFIC_PUSH_MS } from './traffic-ledger';

const at = 1_754_600_000_000;

const clientKey = 'sha256:8706ee88bbbdda48d02a4888691822b90d8b136bc5fb8e3a815e518105f0655c';

function aGatewayServing(...ids: readonly string[]): EngineGateway {
  return {
    slug: 'codex',
    displayName: 'Codex',
    port: 8397,
    virtualModels: ids.map((id) => ({
      id,
      displayName: id,
      target: { standing: 'bound', providerModel: 'gpt-5-mini' },
    })),
  };
}

function aRow(id: string): LogRow {
  return {
    id,
    at,
    gateway: 'codex',
    virtualModel: 'fast',
    origin: 'provider',
    method: 'POST',
    provider: 'openai',
    accountId: 'work',
    providerModel: 'gpt-5-mini',
    status: 200,
    durationMs: 912,
    tokens: 1_820,
    clientKey,
  };
}

function loggedRequest(id: string): unknown {
  return { kind: 'log', row: aRow(id) };
}

function aHostWatchingLogs() {
  const scripted = scriptedChild(running);
  const pushed: LogBatch[] = [];

  return {
    scripted,
    pushed,
    host: createEngineHost({
      knownSlugs: ['codex'],
      grantFor: grantsNothing,
      spawnChild: () => scripted.child,
      onLogs: (batch) => {
        pushed.push(batch);
      },
    }),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('requests the child logs on its own', () => {
  test('a finished request reaches the windows as an appended run', async () => {
    vi.useFakeTimers();
    const { host, scripted, pushed } = aHostWatchingLogs();

    await host.start(aGatewayServing('fast'));
    scripted.send(loggedRequest('log-1'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([{ kind: 'append', rows: [aRow('log-1')] }]);
  });

  test('a host nobody asked to report logs drops them and keeps serving', async () => {
    vi.useFakeTimers();
    const scripted = scriptedChild(running);
    const host = createEngineHost({
      knownSlugs: ['codex'],
      grantFor: grantsNothing,
      spawnChild: () => scripted.child,
    });

    await expect(host.start(aGatewayServing('fast'))).resolves.toEqual({ status: 'running' });

    scripted.send(loggedRequest('log-1'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    await expect(host.start(aGatewayServing('fast'))).resolves.toEqual({ status: 'running' });
  });
});

describe('what a gateway starting hands the windows', () => {
  test('the requests logged before it started cross again as backfill', async () => {
    vi.useFakeTimers();
    const { host, scripted, pushed } = aHostWatchingLogs();

    await host.start(aGatewayServing('fast'));
    scripted.send(loggedRequest('log-1'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    await host.start(aGatewayServing('fast'));

    expect(pushed.at(-1)).toEqual({ kind: 'backfill', rows: [aRow('log-1')] });
  });

  test('a gateway starting on an empty history says nothing to the windows', async () => {
    vi.useFakeTimers();
    const { host, pushed } = aHostWatchingLogs();

    await host.start(aGatewayServing('fast'));

    expect(pushed).toEqual([]);
  });
});
