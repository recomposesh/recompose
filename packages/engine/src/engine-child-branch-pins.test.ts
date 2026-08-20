import { engineBranchPinReportSchema } from '@recompose/contracts';
import { describe, expect, test } from 'vitest';

import type { ParentPort } from './parent-port';
import type { RouteNodeAddress } from './routing/route-node-key';

import { attachEngineChild } from './engine-child';
import { aParent } from './engine-child.testkit';
import { aLoopbackCapturing } from './gateway-app.testkit';
import { routingMemory } from './gateway-routing-memory';

const LADDER: RouteNodeAddress = { slug: 'personal', virtualModel: 'fast', routeNode: 'ladder' };

function anAttachedChild() {
  const parent = aParent();

  attachEngineChild(parent.port, aLoopbackCapturing().openListeners);

  return parent;
}

function talliesIn(reports: readonly unknown[]) {
  return reports.flatMap((report) => {
    const read = engineBranchPinReportSchema.safeParse(report);

    return read.success ? [read.data] : [];
  });
}

describe('what the parent hears about the branches a gateway is holding', () => {
  test('a conversation earning a branch tells the parent what that router now holds', () => {
    const parent = anAttachedChild();

    routingMemory().pins.pin(LADDER, 'session-1', 'coder');

    expect(talliesIn(parent.reports)).toEqual([
      {
        kind: 'branch-pins',
        slug: 'personal',
        virtualModel: 'fast',
        routeNode: 'ladder',
        pinned: { coder: 1 },
      },
    ]);
  });

  test('a conversation forgotten for going quiet tells the parent the branch let it go', () => {
    const parent = anAttachedChild();
    const memory = routingMemory();

    memory.pins.pin(LADDER, 'session-1', 'coder');
    memory.pins.pin(LADDER, 'session-1', 'talker');

    expect(talliesIn(parent.reports).at(-1)?.pinned).toEqual({ talker: 1 });
  });

  test('the report carries no conversation, so no fingerprint reaches the parent', () => {
    const parent = anAttachedChild();

    routingMemory().pins.pin(LADDER, 'a-recognizable-fingerprint', 'coder');

    expect(JSON.stringify(parent.reports)).not.toContain('a-recognizable-fingerprint');
  });

  test('a lane the parent cannot hear costs the request nothing', () => {
    const parent = aParent();
    const brokenPort: ParentPort = {
      postMessage: (message) => {
        if (engineBranchPinReportSchema.safeParse(message).success) {
          throw new Error('the parent port is gone');
        }

        parent.port.postMessage(message);
      },
      on: parent.port.on,
    };

    attachEngineChild(brokenPort, aLoopbackCapturing().openListeners);

    expect(() => {
      routingMemory().pins.pin(LADDER, 'session-1', 'coder');
    }).not.toThrow();
  });
});
