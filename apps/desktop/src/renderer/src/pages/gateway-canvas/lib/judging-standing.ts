import type { RequestOutcome } from '@recompose/contracts';

import type { EngineReadings, SeatedCard } from './card-standing';

import { heldAt } from './held-at';

/**
 * Whether one router is waiting on the judge it asked right now.
 *
 * @summary The count is read under the router rather than the judge, because a judge two routers
 * share would otherwise light both ties when only one of them asked. A tie asks with the router it
 * advises, and the router asks with its own id, so the two can never disagree about one wait.
 */
export function waitingOnItsJudge(
  readings: EngineReadings,
  model: string,
  routeNodeId: string,
): boolean {
  const asked = heldAt(heldAt(readings.judging, model), routeNodeId);

  return asked !== undefined && asked > 0;
}

/**
 * The routers of one model a request is sitting at right now, waiting on the judge each asked.
 *
 * @summary A request parked at a judge has reached no child yet, so the traffic table names no node
 * for it, and every cable above the decision would rest while the tie beside it pulsed. The router
 * is where the request stands, so it carries a live reading of its own, and the cable into it, the
 * routers above it, and the gateway's wire all light off the derivation ADR-0140 already runs.
 *
 * The reading is stamped now, which is what makes a decision under way outrank whatever the last
 * request left: a wire still red from a refusal a moment ago would say this request had already
 * failed. It is deliberately not traffic, so nothing is recorded against the judge itself and the
 * tie stays the one line on this canvas that no request travels.
 */
export function waitingOnAJudge(
  seated: readonly SeatedCard[],
  readings: EngineReadings,
  model: string,
): Record<string, RequestOutcome> {
  const waiting: Record<string, RequestOutcome> = {};

  for (const { placed } of seated) {
    const { node, routeNodeId } = placed.walked;

    if (node.kind === 'router' && waitingOnItsJudge(readings, model, routeNodeId)) {
      waiting[routeNodeId] = { outcome: 'live', at: readings.now };
    }
  }

  return waiting;
}
