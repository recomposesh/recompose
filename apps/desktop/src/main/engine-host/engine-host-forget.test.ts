import type {
  EngineGateway,
  EngineStates,
  GatewayTraffic,
  LogBatch,
  LogRow,
} from '@recompose/contracts';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { createEngineHost } from './engine-host';
import { grantsNothing, hostOver, running, scriptedChild } from './engine-host.testkit';
import { TRAFFIC_PUSH_MS } from './traffic-ledger';

const at = 1_754_600_000_000;

const clientKey = 'sha256:8706ee88bbbdda48d02a4888691822b90d8b136bc5fb8e3a815e518105f0655c';

const codex: EngineGateway = { slug: 'codex', displayName: 'Codex', port: 8397, virtualModels: [] };

function aRow(id: string): LogRow {
  return {
    id,
    at,
    gateway: 'codex',
    origin: 'provider',
    method: 'POST',
    status: 200,
    durationMs: 912,
    clientKey,
  };
}

function aHostRemembering() {
  const scripted = scriptedChild(running);
  const traffic: GatewayTraffic[] = [];
  const logs: LogBatch[] = [];

  return {
    scripted,
    traffic,
    logs,
    host: createEngineHost({
      knownSlugs: ['codex'],
      grantFor: grantsNothing,
      spawnChild: () => scripted.child,
      onTraffic: (snapshot) => {
        traffic.push(snapshot);
      },
      onLogs: (batch) => {
        logs.push(batch);
      },
    }),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('a gateway the engine host forgot', () => {
  test('the forgotten gateway leaves the ledger while its siblings stand', async () => {
    const { host } = hostOver(scriptedChild(running), ['codex', 'gemini']);

    await host.start(codex);
    host.forget?.('codex');

    expect(host.states()).toEqual({ gemini: { status: 'stopped' } });
  });

  test('the subscribers hear the ledger without it', async () => {
    const { host } = hostOver(scriptedChild(running), ['codex', 'gemini']);
    const heard: EngineStates[] = [];

    await host.start(codex);
    host.onStatesChanged((states) => {
      heard.push(states);
    });
    host.forget?.('codex');

    expect(heard).toEqual([{ gemini: { status: 'stopped' } }]);
  });

  test('forgetting a gateway the ledger never held says nothing', () => {
    const { host } = hostOver(scriptedChild(running), ['codex']);
    const heard: EngineStates[] = [];

    host.onStatesChanged((states) => {
      heard.push(states);
    });
    host.forget?.('ghost');

    expect(heard).toEqual([]);
    expect(host.states()).toEqual({ codex: { status: 'stopped' } });
  });
});

describe('the readings a forgotten gateway leaves behind', () => {
  test('its traffic leaves the snapshot', async () => {
    vi.useFakeTimers();
    const { host, scripted, traffic } = aHostRemembering();

    await host.start(codex);
    scripted.send({
      kind: 'traffic',
      slug: 'codex',
      virtualModel: 'fast',
      routeNode: 'seat',
      request: { outcome: 'served', at },
    });
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    host.forget?.('codex');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(traffic.at(-1)).toEqual({});
  });

  test('its logs never cross again', async () => {
    vi.useFakeTimers();
    const { host, scripted, logs } = aHostRemembering();

    await host.start(codex);
    scripted.send({ kind: 'log', row: aRow('log-1') });
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    host.forget?.('codex');
    host.replayLogs();

    expect(logs).toEqual([{ kind: 'append', rows: [aRow('log-1')] }]);
  });
});
