import { engineJudgingReportSchema, type GatewayJudging } from '@recompose/contracts';

import type { RouteNodeDesk, RouteNodeFiling } from './route-node-desk';

import { openRouteNodeDesk } from './route-node-desk';

export type JudgingDesk = RouteNodeDesk;

function waitingIn(message: unknown): RouteNodeFiling<number> | undefined {
  const report = engineJudgingReportSchema.safeParse(message);

  if (!report.success) {
    return undefined;
  }

  const { slug, virtualModel, routeNode, judging } = report.data;

  return { slug, virtualModel, routeNode, reading: judging };
}

/**
 * Holds which routers are waiting on a judge and tells the windows while they are.
 *
 * @summary A gateway that stops is dropped whole rather than left waiting, because a request in
 * flight died with the child carrying it and a tie left pulsing would promise a person that
 * something was still being decided.
 */
export function openJudgingDesk(push: (judging: GatewayJudging) => void): JudgingDesk {
  return openRouteNodeDesk(waitingIn, push);
}
