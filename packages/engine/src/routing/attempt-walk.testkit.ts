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
  pinnedChildAt?: (routeNode: string) => string | undefined;
  pinChildAt?: (routeNode: string, child: string) => void;
};

export type Turn = { resumesServerState?: boolean; conversation?: string };

/**
 * The child each conversation keeps at each spreading router, for the length of one scene.
 *
 * @summary The gateway binds the conversation before the walk ever sees the store, so the walk's own
 * seam holds one conversation at a time. A scene sends several, which is why the mark rides the key
 * here and rides nothing at all in the engine.
 */
function aKeptChildStore() {
  const held = new Map<string, string>();
  const key = (conversation: string, routeNode: string) =>
    JSON.stringify([conversation, routeNode]);

  return {
    forOneConversation: (conversation: string) => ({
      pinnedChildAt: (routeNode: string) => held.get(key(conversation, routeNode)),
      pinChildAt: (routeNode: string, child: string) => {
        held.set(key(conversation, routeNode), child);
      },
    }),
  };
}

/**
 * The judging a scene that named none stands under: nobody classifies and no branch is kept.
 *
 * @summary A refusal rather than an absent classifier, because the two settle a walk the same way
 * and one shape means the walk never has to ask whether anybody is judging at all.
 */
function judgingNobodyWired(
  scene: Scene,
  judgeStandsCooling: (judge: string) => boolean,
): JudgedRequest {
  return {
    classifyBranch: scene.classifyBranch ?? (async () => Promise.resolve({ heard: 'refusal' })),
    judgeStandsCooling,
    pinnedBranchAt: scene.pinnedBranchAt ?? (() => undefined),
    pinBranchAt:
      scene.pinBranchAt ??
      (() => {
        return;
      }),
  };
}

type KeptChildren = {
  pinnedChildAt: (routeNode: string) => string | undefined;
  pinChildAt: (routeNode: string, child: string) => void;
};

function rotationPinsOf(scene: Scene, held: KeptChildren): KeptChildren {
  return {
    pinnedChildAt: scene.pinnedChildAt ?? held.pinnedChildAt,
    pinChildAt: scene.pinChildAt ?? held.pinChildAt,
  };
}

function sealingOf(scene: Scene, turn: Turn): boolean {
  return turn.resumesServerState ?? scene.resumesServerState ?? false;
}

export function aGatewayServing(routing: EngineRouting, scene: Scene = {}) {
  let clock = NOW;
  const ledger = createCooldownLedger(() => clock);
  const cursors = createRotationCursors();
  const kept = aKeptChildStore();

  return {
    tick: (span: number) => {
      clock += span;
    },
    cooling: (routeNode: string) =>
      ledger.coolingAt({ slug: 'main', virtualModel: 'fast', routeNode }),
    turnAt: (routeNode: string) =>
      cursors.cursorAt({ slug: 'main', virtualModel: 'fast', routeNode }),
    standDown: (routeNode: string, span: number) => {
      ledger.cool({ slug: 'main', virtualModel: 'fast', routeNode }, { coolUntilMs: clock + span });
    },
    send: async (replies: Replies = {}, turn: Turn = {}) => {
      const attempted: string[] = [];
      const held = kept.forOneConversation(turn.conversation ?? 'one');
      const rotationPins = rotationPinsOf(scene, held);
      const walk = await walkAttempts<string>({
        routing,
        slug: 'main',
        virtualModel: 'fast',
        ledger,
        cursors,
        judged: judgingNobodyWired(
          scene,
          (judge) =>
            ledger.coolingAt({ slug: 'main', virtualModel: 'fast', routeNode: judge }) !==
            undefined,
        ),
        resumesServerState: sealingOf(scene, turn),
        rotationPins,
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
    classifyBranch: async (_routeNode, judge) => {
      asked.push(judge);

      return Promise.resolve(readings[asked.length - 1] ?? readings.at(-1) ?? { heard: 'timeout' });
    },
  };
}

export type HeldJudge = {
  asked: Promise<void>;
  release: () => void;
  classifyBranch: BranchClassifier;
};

async function aReadingHeldBy(
  waiting: (() => void)[],
  reading: JudgeReading,
): Promise<JudgeReading> {
  return new Promise<JudgeReading>((resolve) => {
    waiting.push(() => {
      resolve(reading);
    });
  });
}

/**
 * A judge that answers nobody until it is released, so two walks can sit inside one classification.
 *
 * @summary A gateway serves many requests at once, and a judge call is the longest await a walk
 * takes, so whatever a walk writes on its way down is either visible to the walk beside it or it is
 * not. Holding the answer open is the only way a spec can stand two walks in that window at once.
 * An ask arriving after the release answers straight away, so a walk that never reached the judge
 * cannot hang the spec.
 */
export function aJudgeHeldOpen(reading: JudgeReading): HeldJudge {
  const waiting: (() => void)[] = [];
  let released = false;
  let noticeAsked = () => {
    return;
  };
  const asked = new Promise<void>((resolve) => {
    noticeAsked = resolve;
  });

  return {
    asked,
    release: () => {
      released = true;

      for (const letGo of waiting.splice(0)) letGo();
    },
    classifyBranch: async () => {
      noticeAsked();

      return released ? reading : aReadingHeldBy(waiting, reading);
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

/**
 * A round-robin router holding a judged router beside plain children of its own.
 *
 * @summary The judged router looks alive from above, because one of its branch children is healthy,
 * so the rotation offers it a turn and only the judge's own answer reveals that the branch it named
 * cannot serve. That is the one shape where a turn is offered to a subtree that takes no request.
 */
export function aRotationBesideAJudgedRouter(...spares: readonly string[]): EngineRouting {
  const nodes: Record<string, EngineRouteNode> = {
    ...aJudgedRouterOver().nodes,
    top: aRoundRobinOver('ladder', ...spares),
  };

  for (const spare of spares) nodes[spare] = aBoundTarget();

  return aTableEnteredAt('top', nodes);
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
