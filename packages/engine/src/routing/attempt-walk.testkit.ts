import type { EngineRouteNode, EngineRouting } from '@recompose/contracts';

import type { BranchClassifier, JudgedRequest } from './judge-decision';
import type { AttemptReading, JudgeReading } from './outcome-classification';

import { walkAttempts } from './attempt-walk';
import { createCooldownLedger } from './cooldown-ledger';
import { createRotationCursors } from './rotation-cursors';
import { aBoundTarget, aFailoverOver, aRoundRobinOver, aTableEnteredAt } from './routing.testkit';

export const NOW = 1_700_000_000_000;

export const JUDGE = 'judge';

export type Replies = Readonly<Record<string, AttemptReading<string>>>;

export type Scene = {
  resumesServerState?: boolean;
  classifyBranch?: BranchClassifier;
  pinnedBranchAt?: (routeNode: string) => string | undefined;
  pinBranchAt?: (routeNode: string, child: string) => void;
};

/**
 * The judging a scene that named none stands under: nobody classifies and no branch is kept.
 *
 * @summary A refusal rather than an absent classifier, because the two settle a walk the same way
 * and one shape means the walk never has to ask whether anybody is judging at all.
 */
function judgingNobodyWired(scene: Scene): JudgedRequest {
  return {
    classifyBranch: scene.classifyBranch ?? (async () => Promise.resolve({ heard: 'refusal' })),
    pinnedBranchAt: scene.pinnedBranchAt ?? (() => undefined),
    pinBranchAt:
      scene.pinBranchAt ??
      (() => {
        return;
      }),
  };
}

export function aGatewayServing(routing: EngineRouting, scene: Scene = {}) {
  let clock = NOW;
  const ledger = createCooldownLedger(() => clock);
  const cursors = createRotationCursors();

  return {
    tick: (span: number) => {
      clock += span;
    },
    cooling: (routeNode: string) =>
      ledger.coolingAt({ slug: 'main', virtualModel: 'fast', routeNode }),
    standDown: (routeNode: string, span: number) => {
      ledger.cool({ slug: 'main', virtualModel: 'fast', routeNode }, { coolUntilMs: clock + span });
    },
    send: async (replies: Replies = {}) => {
      const attempted: string[] = [];
      const walk = await walkAttempts<string>({
        routing,
        slug: 'main',
        virtualModel: 'fast',
        ledger,
        cursors,
        judged: judgingNobodyWired(scene),
        resumesServerState: scene.resumesServerState ?? false,
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

export type AskedJudge = { asked: string[]; classifyBranch: BranchClassifier };

export function aJudgeAnswering(...readings: readonly JudgeReading[]): AskedJudge {
  const asked: string[] = [];

  return {
    asked,
    classifyBranch: async (judge) => {
      asked.push(judge);

      return Promise.resolve(readings[asked.length - 1] ?? readings.at(-1) ?? { heard: 'timeout' });
    },
  };
}

export type JudgedRouter = {
  branches: Readonly<Record<string, string>>;
  elseChild: string;
  rejudgeEveryRequest: boolean;
};

const JUDGED: JudgedRouter = {
  branches: { code: 'coder', chat: 'talker' },
  elseChild: 'catchall',
  rejudgeEveryRequest: false,
};

function judgedPolicy(router: JudgedRouter, children: readonly string[]): EngineRouteNode {
  return {
    kind: 'router',
    policy: {
      mode: 'conditional',
      judge: JUDGE,
      branches: Object.entries(router.branches).map(([label, child]) => ({
        label,
        rule: `asks about ${label}`,
        child,
      })),
      elseChild: router.elseChild,
      judgeBoundMs: 2_000,
      rejudgeEveryRequest: router.rejudgeEveryRequest,
    },
    children: [...children],
  };
}

export function aJudgedRouterOver(wiring: Partial<JudgedRouter> = {}): EngineRouting {
  const router = { ...JUDGED, ...wiring };
  const children = [...new Set([...Object.values(router.branches), router.elseChild])];
  const nodes: Record<string, EngineRouteNode> = {
    ladder: judgedPolicy(router, children),
    [JUDGE]: aBoundTarget(),
  };

  for (const child of children) nodes[child] = aBoundTarget();

  return aTableEnteredAt('ladder', nodes);
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
