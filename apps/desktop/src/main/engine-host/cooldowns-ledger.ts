import { engineCooldownReportSchema, type GatewayCooldowns } from '@recompose/contracts';

import type { RouteNodeDesk, RouteNodeFiling } from './route-node-desk';

import { openRouteNodeDesk } from './route-node-desk';

export type CooldownDesk = RouteNodeDesk;

function standingDownIn(message: unknown): RouteNodeFiling<number> | undefined {
  const report = engineCooldownReportSchema.safeParse(message);

  if (!report.success) {
    return undefined;
  }

  const { slug, virtualModel, routeNode, coolUntilMs } = report.data;

  return { slug, virtualModel, routeNode, reading: coolUntilMs };
}

/**
 * Holds when every route node stands back up and tells the windows about it.
 *
 * @summary A gateway that stops is dropped whole rather than left standing down, because cooling
 * lives in the engine child's runtime memory and dies with the gateway keeping it. A window kept
 * past that would tell a person a judge is out when the next request would reach it fine.
 */
export function openCooldownDesk(push: (cooling: GatewayCooldowns) => void): CooldownDesk {
  return openRouteNodeDesk(standingDownIn, push);
}
