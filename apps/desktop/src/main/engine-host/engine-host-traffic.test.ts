import type { EngineGateway, EngineVirtualModel, GatewayTraffic } from '@recompose/contracts';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { createEngineHost } from './engine-host';
import { grantsNothing, running, scriptedChild } from './engine-host.testkit';
import { TRAFFIC_PUSH_MS } from './traffic-ledger';

const at = 1_754_600_000_000;

const onlyNode = 'only';

function aBoundRouting(): EngineVirtualModel['routing'] {
  return {
    entry: onlyNode,
    nodes: {
      [onlyNode]: { kind: 'target', standing: { standing: 'bound', providerModel: 'gpt-5-mini' } },
    },
  };
}

function aGatewayServing(...ids: readonly string[]): EngineGateway {
  return {
    slug: 'codex',
    displayName: 'Codex',
    port: 8397,
    virtualModels: ids.map((id) => ({ id, displayName: id, routing: aBoundRouting() })),
  };
}

function servedThrough(virtualModel: string): unknown {
  return {
    kind: 'traffic',
    slug: 'codex',
    virtualModel,
    routeNode: onlyNode,
    request: { outcome: 'served', at },
  };
}

function aHostWatchingTraffic() {
  const scripted = scriptedChild(running);
  const pushed: GatewayTraffic[] = [];

  return {
    scripted,
    pushed,
    host: createEngineHost({
      knownSlugs: ['codex'],
      grantFor: grantsNothing,
      spawnChild: () => scripted.child,
      onTraffic: (traffic) => {
        pushed.push(traffic);
      },
    }),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('traffic the child reports on its own', () => {
  test('a finished request reaches the windows as the whole snapshot', async () => {
    vi.useFakeTimers();
    const { host, scripted, pushed } = aHostWatchingTraffic();

    await host.start(aGatewayServing('fast'));
    scripted.send(servedThrough('fast'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([{ codex: { fast: { [onlyNode]: { outcome: 'served', at } } } }]);
  });

  test('a host nobody asked to report traffic drops it and keeps serving', async () => {
    vi.useFakeTimers();
    const scripted = scriptedChild(running);
    const host = createEngineHost({
      knownSlugs: ['codex'],
      grantFor: grantsNothing,
      spawnChild: () => scripted.child,
    });

    await expect(host.start(aGatewayServing('fast'))).resolves.toEqual({ status: 'running' });

    scripted.send(servedThrough('fast'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    await expect(host.start(aGatewayServing('fast'))).resolves.toEqual({ status: 'running' });
  });
});

describe('a gateway starting under a changed set of models', () => {
  test('a model that left the config leaves the traffic snapshot with it', async () => {
    vi.useFakeTimers();
    const { host, scripted, pushed } = aHostWatchingTraffic();

    await host.start(aGatewayServing('fast', 'deep'));
    scripted.send(servedThrough('fast'));
    scripted.send(servedThrough('deep'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    await host.start(aGatewayServing('fast'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({ codex: { fast: { [onlyNode]: { outcome: 'served', at } } } });
  });

  test('a restart under the same models leaves every outcome standing', async () => {
    vi.useFakeTimers();
    const { host, scripted, pushed } = aHostWatchingTraffic();

    await host.start(aGatewayServing('fast'));
    scripted.send(servedThrough('fast'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    await host.restart(aGatewayServing('fast'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toHaveLength(1);
    expect(pushed.at(-1)).toEqual({ codex: { fast: { [onlyNode]: { outcome: 'served', at } } } });
  });
});
