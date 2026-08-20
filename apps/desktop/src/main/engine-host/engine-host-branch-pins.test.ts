import type {
  EngineGateway,
  EngineVirtualModel,
  GatewayBranchPins,
  GatewayEngineState,
} from '@recompose/contracts';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { createEngineHost } from './engine-host';
import { grantsNothing, nothing, running, scriptedChild } from './engine-host.testkit';
import { TRAFFIC_PUSH_MS } from './traffic-ledger';

const LADDER = 'ladder';

function aBoundRouting(): EngineVirtualModel['routing'] {
  return {
    entry: LADDER,
    nodes: {
      [LADDER]: { kind: 'target', standing: { standing: 'bound', providerModel: 'gpt-5-mini' } },
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

function pinnedUnder(virtualModel: string, pinned: Record<string, number>): unknown {
  return { kind: 'branch-pins', slug: 'codex', virtualModel, routeNode: LADDER, pinned };
}

function aHostWatchingBranchPins(answer: () => GatewayEngineState | null = running) {
  const scripted = scriptedChild(answer);
  const pushed: GatewayBranchPins[] = [];

  return {
    scripted,
    pushed,
    host: createEngineHost({
      knownSlugs: ['codex'],
      grantFor: grantsNothing,
      spawnChild: () => scripted.child,
      onBranchPins: (pinning) => {
        pushed.push(pinning);
      },
    }),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('the branch counts the child reports on its own', () => {
  test('a pinned conversation reaches the windows as the whole snapshot', async () => {
    vi.useFakeTimers();
    const { host, scripted, pushed } = aHostWatchingBranchPins();

    await host.start(aGatewayServing('fast'));
    scripted.send(pinnedUnder('fast', { coder: 2 }));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([{ codex: { fast: { [LADDER]: { coder: 2 } } } }]);
  });

  test('a host nobody asked to report pins drops them and keeps serving', async () => {
    vi.useFakeTimers();
    const scripted = scriptedChild(running);
    const host = createEngineHost({
      knownSlugs: ['codex'],
      grantFor: grantsNothing,
      spawnChild: () => scripted.child,
    });

    await expect(host.start(aGatewayServing('fast'))).resolves.toEqual({ status: 'running' });

    scripted.send(pinnedUnder('fast', { coder: 2 }));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    await expect(host.start(aGatewayServing('fast'))).resolves.toEqual({ status: 'running' });
  });

  test('a tally never reads as traffic, so neither desk takes the other word', async () => {
    vi.useFakeTimers();
    const scripted = scriptedChild(running);
    const traffic: unknown[] = [];
    const host = createEngineHost({
      knownSlugs: ['codex'],
      grantFor: grantsNothing,
      spawnChild: () => scripted.child,
      onTraffic: (flowing) => {
        traffic.push(flowing);
      },
    });

    await host.start(aGatewayServing('fast'));
    scripted.send(pinnedUnder('fast', { coder: 2 }));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(traffic).toEqual([]);
  });
});

describe('a gateway that stops holding conversations', () => {
  test('a stopped gateway counts nothing, because its engine forgot every pin', async () => {
    vi.useFakeTimers();
    const { host, scripted, pushed } = aHostWatchingBranchPins(nothing);

    const starting = host.start(aGatewayServing('fast'));

    await vi.advanceTimersByTimeAsync(0);
    scripted.answerDirective(0, { status: 'running' });
    await starting;

    scripted.send(pinnedUnder('fast', { coder: 2 }));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    const stopping = host.stop('codex');

    await vi.advanceTimersByTimeAsync(0);
    scripted.answerDirective(1, { status: 'stopped' });
    await stopping;
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({});
  });

  test('a gateway removed from the app leaves its counts behind', async () => {
    vi.useFakeTimers();
    const { host, scripted, pushed } = aHostWatchingBranchPins();

    await host.start(aGatewayServing('fast'));
    scripted.send(pinnedUnder('fast', { coder: 2 }));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    host.forget?.('codex');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({});
  });
});
