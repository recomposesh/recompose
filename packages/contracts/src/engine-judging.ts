import { z } from 'zod';

import { gatewaySlugSchema, modelAliasSchema } from './gateway-config';
import { routeNodeIdSchema } from './gateway-routing';

/**
 * How many classifications one conditional router has in flight, which is all this lane carries.
 *
 * @summary A count rather than a flag, because two requests can be judged at one router at once and
 * a flag the second settle cleared would stop the pulse while the first was still waiting. Nothing
 * about the request reaches here: not the tail, not the branches offered, not the label heard. A
 * screen only needs to know that judging is happening, and a number is the whole of that.
 */
const judgingInFlightSchema = z.number().int().nonnegative();

/**
 * What the child says on its own while one router is waiting on its judge.
 *
 * @summary It names the router rather than the judge, because the tie a person watches leaves the
 * router and a judge two routers share would otherwise pulse a cable that is not waiting. It says a
 * count and nothing else, which is what keeps a lane painted for a person free of anything the
 * caller wrote or the judge answered.
 */
export const engineJudgingReportSchema = z.strictObject({
  kind: z.literal('judging'),
  slug: gatewaySlugSchema,
  virtualModel: modelAliasSchema,
  routeNode: routeNodeIdSchema,
  judging: judgingInFlightSchema,
});

export type EngineJudgingReport = z.infer<typeof engineJudgingReportSchema>;

/**
 * Every router waiting on a judge, under the virtual model and the gateway serving it.
 *
 * @summary Keyed exactly like the branch counts and the cooldowns, so one gateway's routers are
 * dropped whole when it stops and a router judging nothing is simply absent or counted at zero.
 */
export const gatewayJudgingSchema = z.record(
  gatewaySlugSchema,
  z.record(modelAliasSchema, z.record(routeNodeIdSchema, judgingInFlightSchema)),
);

export type GatewayJudging = z.infer<typeof gatewayJudgingSchema>;
