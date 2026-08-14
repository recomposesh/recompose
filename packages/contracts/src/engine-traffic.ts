import { z } from 'zod';

import { gatewaySlugSchema } from './gateway-config';
import { routeNodeIdSchema } from './gateway-routing';
import { nonBlankString } from './non-blank';

const answeredAtSchema = z.number().int().nonnegative();

const answeredStatusSchema = z.number().int().min(100).max(599);

/**
 * What the last request through one virtual model came to.
 *
 * @summary A failure carries the status the gateway answered and a sentence written from that
 * status alone, so no prompt and no provider answer can ride along. A served request carries
 * neither, because there is nothing to explain when a request flowed and answered well.
 */
export const requestOutcomeSchema = z.discriminatedUnion('outcome', [
  z.strictObject({ outcome: z.literal('live'), at: answeredAtSchema }),
  z.strictObject({ outcome: z.literal('served'), at: answeredAtSchema }),
  z.strictObject({
    outcome: z.literal('failed'),
    at: answeredAtSchema,
    status: answeredStatusSchema,
    detail: nonBlankString,
  }),
]);

export type RequestOutcome = z.infer<typeof requestOutcomeSchema>;

/**
 * The latest outcome of every route node, under the virtual model and the gateway serving it.
 *
 * @summary One entry per route node rather than a history, because a cable shows what the last
 * request came to and nothing before it. The node level is what lets one request paint two cables:
 * a ladder that moved on from a child records that child's failure beside the success of the one
 * that answered.
 */
export const gatewayTrafficSchema = z.record(
  gatewaySlugSchema,
  z.record(gatewaySlugSchema, z.record(routeNodeIdSchema, requestOutcomeSchema)),
);

export type GatewayTraffic = z.infer<typeof gatewayTrafficSchema>;
