import { z } from 'zod';

import { gatewaySlugSchema, modelAliasSchema } from './gateway-config';
import { routeNodeIdSchema } from './gateway-routing';

/**
 * The moment a route node standing down is ready again, as the clock the engine child reads it.
 *
 * @summary A moment rather than a span, because a span decided in the engine would already be
 * stale by the time a window drew it and a screen would have to count it down to stay honest. The
 * moment is true whenever it is read, which is what lets the inspector print one still reading.
 */
const coolUntilMsSchema = z.number().int().positive();

/**
 * What the child says on its own once one route node has been told to stand down.
 *
 * @summary It carries when the stand-down lifts and nothing about what caused it: the provider's
 * refusal body is the request's business and the request already answers for it, while a window
 * only needs to know how long the node is out. Nothing is said when the moment passes, because a
 * moment already in the past reads as lifted wherever it is held.
 */
export const engineCooldownReportSchema = z.strictObject({
  kind: z.literal('cooldown'),
  slug: gatewaySlugSchema,
  virtualModel: modelAliasSchema,
  routeNode: routeNodeIdSchema,
  coolUntilMs: coolUntilMsSchema,
});

export type EngineCooldownReport = z.infer<typeof engineCooldownReportSchema>;

/**
 * Every route node standing down, under the virtual model and the gateway serving it.
 *
 * @summary Keyed exactly like the branch counts, so one gateway's nodes are dropped whole when it
 * stops and a node that never stood down is simply absent. A judge and a child that both cooled are
 * two entries rather than one reading about the router above them, because they stand back up on
 * their own clocks. The model level reads the alias vocabulary rather than the gateway's, since an
 * alias keeps the dots a real model name carries.
 */
export const gatewayCooldownsSchema = z.record(
  gatewaySlugSchema,
  z.record(modelAliasSchema, z.record(routeNodeIdSchema, coolUntilMsSchema)),
);

export type GatewayCooldowns = z.infer<typeof gatewayCooldownsSchema>;
