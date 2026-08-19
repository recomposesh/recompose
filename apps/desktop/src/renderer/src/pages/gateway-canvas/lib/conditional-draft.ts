import type { GatewayConfig, RouteTarget } from '@recompose/contracts';

import { routedThroughAConditionalRouter } from './routing-edits-conditional';

/** The account and the real model a judge reads requests with, which is a binding like any other. */
export type JudgeBinding = { accountId: string; providerModel: string };

/**
 * Whether the judge has been named whole, which is the last answer a conditional draft waits on.
 *
 * @summary Half a judge is worse than none: a router stored against an account with no model would
 * parse and then refuse every request it read, so the save stays shut until both halves stand.
 */
export function judgeAnswered(judge: JudgeBinding | undefined): boolean {
  return judge !== undefined && judge.accountId !== '' && judge.providerModel !== '';
}

/**
 * The gateway as it stands once it carries a definition routing through a conditional router.
 *
 * @summary The target the drawer already collected becomes the else child, because choosing this
 * mode is choosing what catches everything the judge cannot place, and a conditional router born
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
