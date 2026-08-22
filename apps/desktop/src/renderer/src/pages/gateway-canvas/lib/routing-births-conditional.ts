import type { GatewayConfig, RouteNode, RouteTarget, Routing } from '@recompose/contracts';

import { mintRouteNodeId } from '@recompose/contracts';

import type { JudgeBinding } from './conditional-draft';

import { bornConditionalPolicy } from './conditional-policy';
import { gatewayBindingChild, routedBy } from './routing-edits';

/**
 * A route table reaching one fresh conditional router, over the one child that catches everything.
 *
 * @summary A conditional router cannot be born the way the other two are, because its stored shape
 * names an else child and a judge by id: a router born holding neither would be a table the schema
 * refuses. So the birth takes both, and the target a person picked in the drawer becomes the else
 * child, which is what choosing this mode means. The branches arrive afterwards, one per cable.
 */
export function routedThroughAConditionalRouter(
  judge: RouteTarget,
  elseChild: RouteTarget,
  displayName?: string,
): Routing {
  const entry = mintRouteNodeId();
  const judgeId = mintRouteNodeId();
  const elseId = mintRouteNodeId();
  const router: RouteNode = {
    kind: 'router',
    policy: bornConditionalPolicy(judgeId, elseId),
    children: [elseId],
  };

  return {
    entry,
    nodes: {
      [entry]: displayName === undefined ? router : { ...router, displayName },
      [judgeId]: judge,
      [elseId]: elseChild,
    },
  };
}

/**
 * The gateway as it stands once it carries a definition routing through a conditional router.
 *
 * @summary The target the drawer already collected becomes the else child, because choosing this
 * mode is choosing what catches a request the judge reads but cannot place, and one born
 * without one is a table the stored shape refuses. The branches arrive later, one per cable, so the
 * router is born holding the judge, the fallback, and nothing else.
 */
export function gatewayDefiningJudged(
  gateway: GatewayConfig,
  named: { id: string; displayName: string },
  judge: JudgeBinding,
  elseChild: RouteTarget,
  routerName?: string,
): GatewayConfig {
  const reading: RouteTarget = { kind: 'target', ...judge };

  return {
    ...gateway,
    virtualModels: [
      ...gateway.virtualModels,
      { ...named, routing: routedThroughAConditionalRouter(reading, elseChild, routerName) },
    ],
  };
}

/**
 * The gateway once a bound definition reaches a fresh conditional router instead of what it bound.
 *
 * @summary The spreading twin of this makes what stood there the router's first child, and so does
 * this one, because a person dropping a router onto a bound model never asked to unbind what it
 * already reached. Under this mode that child is a branch holding no rule yet, which the ladder
 * already says out loud, so the work a person did survives and the one thing left is to word it.
 * The else child is the target the walk asked for rather than the displaced binding: reusing the
 * binding would make the branch and the fallback the same node, and a rule written on it later
 * would quietly change where everything unmatched goes.
 */
export function gatewayJudgingThrough(
  gateway: GatewayConfig,
  modelId: string,
  judge: RouteTarget,
  elseChild: RouteTarget,
): GatewayConfig {
  return routedBy(gateway, modelId, (was) => {
    const entry = mintRouteNodeId();
    const judgeId = mintRouteNodeId();
    const elseId = mintRouteNodeId();

    return {
      entry,
      nodes: {
        ...was.nodes,
        [entry]: {
          kind: 'router',
          policy: bornConditionalPolicy(judgeId, elseId),
          children: [was.entry, elseId],
        },
        [judgeId]: judge,
        [elseId]: elseChild,
      },
    };
  });
}

/** Where a fresh nested router lands: the definition, the router taking it, and its own id. */
export type NestedAddress = { modelId: string; routerId: string; bornId: string };

/**
 * The gateway once a stored router holds a fresh conditional router, over the two nodes it needs.
 *
 * @summary A conditional router cannot be nested the way the other two are: its stored shape names
 * a judge and an else child by id, so one holding neither is a table the schema refuses. The walk
 * that dropped it gathered both first, and all three nodes join in a single write, because a
 * document carrying the router alone would never reach storage to be finished afterwards.
 */
export function gatewayNestingAJudgedRouter(
  gateway: GatewayConfig,
  address: NestedAddress,
  judge: RouteTarget,
  elseChild: RouteTarget,
): GatewayConfig {
  const judgeId = mintRouteNodeId();
  const elseId = mintRouteNodeId();
  const grown = gatewayBindingChild(gateway, address.modelId, address.routerId, address.bornId, {
    kind: 'router',
    policy: bornConditionalPolicy(judgeId, elseId),
    children: [elseId],
  });

  return routedBy(grown, address.modelId, (was) =>
    was.nodes[address.bornId] === undefined
      ? was
      : { entry: was.entry, nodes: { ...was.nodes, [judgeId]: judge, [elseId]: elseChild } },
  );
}
