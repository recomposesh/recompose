import { z } from 'zod';

import { gatewaySlugSchema, modelAliasSchema } from './gateway-config';
import { routeNodeIdSchema } from './gateway-routing';
import { nonBlankString } from './non-blank';

const answeredAtSchema = z.number().int().nonnegative();

const answeredStatusSchema = z.number().int().min(100).max(599);

/**
 * What the last request through one virtual model came to.
 *
 * @summary A failure carries the status the gateway answered and one sentence explaining it. Where
 * the target explained itself, that sentence is the target's own words, read from its error body and
 * cut to 280 characters, because a person pressing a red cable wants the reason the target gave
 * rather than a paraphrase of its status. Where the target answered without a readable word, the
 * gateway writes the sentence from the status instead. Nothing the request itself carried ever rides
 * along either way, and a served request carries no sentence at all, because there is nothing to
 * explain when a request flowed and answered well.
 *
 * A row is stricter than a cable here: `logRowSchema` never carries a target's words. The two part
 * ways on purpose, because a cable is pressed by the person who owns the gateway while a row is
 * counted, exported, and read in bulk.
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
 *
 * The model level reads the alias vocabulary rather than the gateway's, the way the pins and the
 * cooldowns beside it do, since an alias keeps the dots a real model name carries.
 */
export const gatewayTrafficSchema = z.record(
  gatewaySlugSchema,
  z.record(modelAliasSchema, z.record(routeNodeIdSchema, requestOutcomeSchema)),
);

export type GatewayTraffic = z.infer<typeof gatewayTrafficSchema>;
