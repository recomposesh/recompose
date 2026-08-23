import type { EngineGateway, PlanUsageReadings } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { createEngineHost } from './engine-host';
import { grantsNothing, running, scriptedChild } from './engine-host.testkit';

const READ_AT = 1_700_000_060_000;

function aGatewayServing(): EngineGateway {
  return {
    slug: 'codex',
    displayName: 'Codex',
    port: 8397,
    virtualModels: [
      {
        id: 'fast',
        displayName: 'fast',
        routing: {
          entry: 'only',
          nodes: {
            only: { kind: 'target', standing: { standing: 'bound', providerModel: 'gpt-5-mini' } },
          },
        },
      },
    ],
  };
}

function readingOf(accountId: string) {
  return {
    accountId,
    provider: 'anthropic',
    readAt: READ_AT,
    windows: [{ length: '5h', spentShare: 0.4 }],
  };
}

function planRead(accountId: string): unknown {
  return { kind: 'plan-usage', reading: readingOf(accountId) };
}

function aHostWatchingPlans() {
  const scripted = scriptedChild(running);
  const pushed: PlanUsageReadings[] = [];

  return {
    scripted,
    pushed,
    host: createEngineHost({
      knownSlugs: ['codex'],
      grantFor: grantsNothing,
      spawnChild: () => scripted.child,
      onPlanUsage: (readings) => {
        pushed.push(readings);
      },
    }),
  };
}

describe('the plan readings the child speaks on its own', () => {
  test('a reading the vendor answered with reaches the windows under its account', async () => {
    const { host, scripted, pushed } = aHostWatchingPlans();

    await host.start(aGatewayServing());
    scripted.send(planRead('sub-1'));

    expect(pushed).toEqual([{ 'sub-1': readingOf('sub-1') }]);
  });

  test('a host nobody asked to report plans drops them and keeps serving', async () => {
    const scripted = scriptedChild(running);
    const host = createEngineHost({
      knownSlugs: ['codex'],
      grantFor: grantsNothing,
      spawnChild: () => scripted.child,
    });

    await host.start(aGatewayServing());
    scripted.send(planRead('sub-1'));

    await expect(host.start(aGatewayServing())).resolves.toEqual({ status: 'running' });
  });
});

describe('a plan reading outliving the gateway that carried it', () => {
  test('a gateway that stops leaves the reading standing, since the plan is the vendor word', async () => {
    const { host, scripted, pushed } = aHostWatchingPlans();

    await host.start(aGatewayServing());
    scripted.send(planRead('sub-1'));
    await host.stop('codex');

    expect(pushed).toEqual([{ 'sub-1': readingOf('sub-1') }]);
  });

  test('a gateway removed from the app leaves the reading standing', async () => {
    const { host, scripted, pushed } = aHostWatchingPlans();

    await host.start(aGatewayServing());
    scripted.send(planRead('sub-1'));
    host.forget?.('codex');

    expect(pushed).toEqual([{ 'sub-1': readingOf('sub-1') }]);
  });

  test('the engine dying on its own leaves the reading standing', async () => {
    const { host, scripted, pushed } = aHostWatchingPlans();

    await host.start(aGatewayServing());
    scripted.send(planRead('sub-1'));
    scripted.exit(1);

    expect(pushed).toEqual([{ 'sub-1': readingOf('sub-1') }]);
  });
});
