import { engineCooldownReportSchema } from '@recompose/contracts';
import { describe, expect, test } from 'vitest';

import type { ParentPort } from './parent-port';
import type { RouteNodeAddress } from './routing/route-node-key';

import { attachEngineChild } from './engine-child';
import { aParent } from './engine-child.testkit';
import { aLoopbackCapturing } from './gateway-app.testkit';
import { routingMemory } from './gateway-routing-memory';

const JUDGE: RouteNodeAddress = { slug: 'personal', virtualModel: 'fast', routeNode: 'j1' };

const LIFTS_AT = 1_700_000_060_000;

function anAttachedChild() {
  const parent = aParent();

  attachEngineChild(parent.port, aLoopbackCapturing().openListeners);

  return parent;
}

function cooldownsIn(reports: readonly unknown[]) {
  return reports.flatMap((report) => {
    const read = engineCooldownReportSchema.safeParse(report);

    return read.success ? [read.data] : [];
  });
}

describe('what the parent hears about a node standing down', () => {
  test('a judge told to stand down tells the parent when it stands back up', () => {
    const parent = anAttachedChild();

    routingMemory().ledger.cool(JUDGE, { coolUntilMs: LIFTS_AT });

    expect(cooldownsIn(parent.reports)).toEqual([
      {
        kind: 'cooldown',
        slug: 'personal',
        virtualModel: 'fast',
        routeNode: 'j1',
        coolUntilMs: LIFTS_AT,
      },
    ]);
  });

  test('a node cooled again tells the parent the later moment it now stands back up', () => {
    const parent = anAttachedChild();
    const memory = routingMemory();

    memory.ledger.cool(JUDGE, { coolUntilMs: LIFTS_AT });
    memory.ledger.cool(JUDGE, { coolUntilMs: LIFTS_AT + 30_000 });

    expect(cooldownsIn(parent.reports).at(-1)?.coolUntilMs).toBe(LIFTS_AT + 30_000);
  });

  test('a lane the parent cannot hear costs the request nothing', () => {
    const parent = aParent();
    const brokenPort: ParentPort = {
      postMessage: (message) => {
        if (engineCooldownReportSchema.safeParse(message).success) {
          throw new Error('the parent port is gone');
        }

        parent.port.postMessage(message);
      },
      on: parent.port.on,
    };

    attachEngineChild(brokenPort, aLoopbackCapturing().openListeners);

    expect(() => {
      routingMemory().ledger.cool(JUDGE, { coolUntilMs: LIFTS_AT });
    }).not.toThrow();
  });
});
