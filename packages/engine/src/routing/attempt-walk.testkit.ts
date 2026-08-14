import type { EngineRouteNode, EngineRouting } from '@recompose/contracts';

import type { AttemptReading } from './outcome-classification';

import { walkAttempts } from './attempt-walk';
import { createCooldownLedger } from './cooldown-ledger';
import { createRotationCursors } from './rotation-cursors';
import { aBoundTarget, aFailoverOver, aRoundRobinOver, aTableEnteredAt } from './routing.testkit';

export const NOW = 1_700_000_000_000;

export type Replies = Readonly<Record<string, AttemptReading<string>>>;

export function aGatewayServing(routing: EngineRouting) {
  let clock = NOW;
  const ledger = createCooldownLedger(() => clock);
  const cursors = createRotationCursors();

  return {
    tick: (span: number) => {
      clock += span;
    },
    cooling: (routeNode: string) =>
      ledger.coolingAt({ slug: 'main', virtualModel: 'fast', routeNode }),
    send: async (replies: Replies = {}) => {
      const attempted: string[] = [];
      const walk = await walkAttempts<string>({
        routing,
        slug: 'main',
        virtualModel: 'fast',
        ledger,
        cursors,
        now: () => clock,
        attempt: async (routeNode) => {
          attempted.push(routeNode);

          return Promise.resolve(replies[routeNode] ?? { kind: 'served', answer: routeNode });
        },
      });

      return { ...walk, attempted };
    },
  };
}

export function aLadderOver(...children: readonly string[]): EngineRouting {
  const nodes: Record<string, EngineRouteNode> = { ladder: aFailoverOver(...children) };

  for (const child of children) nodes[child] = aBoundTarget();

  return aTableEnteredAt('ladder', nodes);
}

export function aRotationOver(...children: readonly string[]): EngineRouting {
  const nodes: Record<string, EngineRouteNode> = { ladder: aRoundRobinOver(...children) };

  for (const child of children) nodes[child] = aBoundTarget();

  return aTableEnteredAt('ladder', nodes);
}

export function refusedBy(
  children: readonly string[],
  reading: () => AttemptReading<string>,
): Replies {
  return Object.fromEntries(children.map((child) => [child, reading()]));
}
