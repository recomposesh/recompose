import {
  type BranchPinTally,
  engineBranchPinReportSchema,
  type GatewayBranchPins,
} from '@recompose/contracts';

import type { RouteNodeDesk, RouteNodeFiling } from './route-node-desk';

import { openRouteNodeDesk } from './route-node-desk';

export type BranchPinDesk = RouteNodeDesk;

function tallyIn(message: unknown): RouteNodeFiling<BranchPinTally> | undefined {
  const report = engineBranchPinReportSchema.safeParse(message);

  if (!report.success) {
    return undefined;
  }

  const { slug, virtualModel, routeNode, pinned } = report.data;

  return { slug, virtualModel, routeNode, reading: pinned };
}

/**
 * Holds what every conditional router is currently pinning and tells the windows in one word.
 *
 * @summary A gateway that stops is dropped whole rather than left standing, because the pins live
 * in the engine child's runtime memory and die with the gateway serving them. Counts kept past that
 * would tell a person conversations are held where nothing is.
 */
export function openBranchPinDesk(push: (pinning: GatewayBranchPins) => void): BranchPinDesk {
  return openRouteNodeDesk(tallyIn, push);
}
