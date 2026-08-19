import type { EngineRouteNode, EngineRouting, SpendGrant } from '@recompose/contracts';

import type { RoutingMemory } from './gateway-routing-memory';
import type { SpendGrantFor } from './gateway-spend';
import type { Crossing } from './gateway-wire';
import type { BranchClassifier } from './routing/judge-decision';
import type { RouteNodeAddress } from './routing/route-node-key';

import { conversationFingerprint } from './gateway-conversation-key';
import { readingOfTheJudge } from './provider/judge-call';

export type JudgingScene = {
  routing: EngineRouting;
  slug: string;
  virtualModel: string;
  crossing: Crossing;
  spendGrantFor: SpendGrantFor;
  fetchLike: typeof fetch;
  memory: RoutingMemory;
};

export type Judged = {
  classifyBranch: BranchClassifier;
  pinnedBranchAt: (routeNode: string) => string | undefined;
  pinBranchAt: (routeNode: string, child: string) => void;
};

type JudgeSeat = { providerModel: string; grant: SpendGrant };

/**
 * How long this table lets the judge think, read from the routers that named it.
 *
 * @summary The budget belongs to the router rather than to the judge, so a judge two routers share
 * carries two of them, and the walk asking here says only which judge it means. The tighter promise
 * wins: a caller waiting on the router that asked for less would otherwise wait the other router's
 * patience out. A judge no conditional router in this table names has no budget at all, which is the
 * shape a call is never made for.
 */
function budgetOneRouterAsksOf(node: EngineRouteNode, judge: string): number | undefined {
  if (node.kind !== 'router' || node.policy.mode !== 'conditional') return undefined;

  return node.policy.judge === judge ? node.policy.judgeBoundMs : undefined;
}

function budgetTheTableAsksOf(routing: EngineRouting, judge: string): number | undefined {
  const asked = Object.values(routing.nodes).flatMap((node) => {
    const budget = budgetOneRouterAsksOf(node, judge);

    return budget === undefined ? [] : [budget];
  });

  return asked.length === 0 ? undefined : Math.min(...asked);
}

/**
 * The judge's own custody, resolved per request exactly as a target's is.
 *
 * @summary A node the table already stands unbound is never asked about, so a judge whose account
 * left costs no round trip to the parent and no cooling entry either: the walk lands on else every
 * time until a person rebinds it, and standing a broken binding down would only pretend the trouble
 * was a provider's.
 */
async function seatOfTheJudge(scene: JudgingScene, judge: string): Promise<JudgeSeat | undefined> {
  const node = scene.routing.nodes[judge];

  if (node?.kind !== 'target' || node.standing.standing !== 'bound') return undefined;

  return {
    providerModel: node.standing.providerModel,
    grant: await scene.spendGrantFor(scene.slug, scene.virtualModel, judge),
  };
}

function addressOf(scene: JudgingScene, routeNode: string): RouteNodeAddress {
  return { slug: scene.slug, virtualModel: scene.virtualModel, routeNode };
}

function classifierFor(scene: JudgingScene): BranchClassifier {
  return async (judge, branches, directive) => {
    const boundMs = budgetTheTableAsksOf(scene.routing, judge);

    if (boundMs === undefined) return { heard: 'timeout' };

    const seat = await seatOfTheJudge(scene, judge);

    if (seat === undefined) return { heard: 'refusal' };

    return readingOfTheJudge({
      grant: seat.grant,
      providerModel: seat.providerModel,
      sourceDialect: scene.crossing.dialect,
      gatewayName: scene.crossing.gatewayName,
      virtualModel: scene.virtualModel,
      branches,
      directive,
      raw: scene.crossing.raw,
      boundMs,
      fetchLike: scene.fetchLike,
      now: scene.memory.now,
      cool: (cooling) => {
        scene.memory.ledger.cool(addressOf(scene, judge), cooling);
      },
    });
  };
}

/**
 * Everything one request needs to be judged and remembered, built once and handed to the walk.
 *
 * @summary The walk knows no transport and no credential, so the classification arrives injected
 * beside the attempt and both close over this one request. The conversation is recognized lazily,
 * because a table with no conditional router in it never asks and must pay nothing for the answer.
 */
export function judgedRouting(scene: JudgingScene): Judged {
  let marked: string | undefined;

  const fingerprint = (): string => {
    marked ??= conversationFingerprint(scene.crossing);

    return marked;
  };

  return {
    classifyBranch: classifierFor(scene),
    pinnedBranchAt: (routeNode) =>
      scene.memory.pins.pinnedAt(addressOf(scene, routeNode), fingerprint()),
    pinBranchAt: (routeNode, child) => {
      scene.memory.pins.pin(addressOf(scene, routeNode), fingerprint(), child);
    },
  };
}
