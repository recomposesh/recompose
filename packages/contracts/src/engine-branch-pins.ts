import { z } from 'zod';

import { gatewaySlugSchema } from './gateway-config';
import { routeNodeIdSchema } from './gateway-routing';

/**
 * How many conversations each branch of one conditional router is currently holding.
 *
 * @summary A count and nothing else. The pin behind it is keyed by a conversation fingerprint, and
 * that fingerprint is derived from what the caller asked, so a shape that could carry it would put
 * request content on a lane a window reads. Counting is the whole of what a person needs to see a
 * branch working, so the shape refuses every field that would say more than how many.
 *
 * A branch is counted only while it holds something. Zero is refused rather than stored, because a
 * branch nothing pinned reads the same as a branch nobody declared and a row for it would print a
 * number where the screen means to print nothing.
 */
export const branchPinTallySchema = z.record(routeNodeIdSchema, z.number().int().positive());

export type BranchPinTally = z.infer<typeof branchPinTallySchema>;

/**
 * What the child says on its own once one conditional router's branch counts have moved.
 *
 * @summary It answers no directive for the same reason traffic does not: the child speaks the
 * moment a conversation earns a branch or lets one go. One report carries that router's whole count
 * rather than a delta, so a report the parent never heard costs one stale number until the next
 * write, instead of a tally that drifts further wrong with every miss.
 *
 * It shapes itself here rather than beside the other child reports, because what may cross is the
 * question this file exists to answer and the report is the lane where a fingerprint would try.
 */
export const engineBranchPinReportSchema = z.strictObject({
  kind: z.literal('branch-pins'),
  slug: gatewaySlugSchema,
  virtualModel: gatewaySlugSchema,
  routeNode: routeNodeIdSchema,
  pinned: branchPinTallySchema,
});

export type EngineBranchPinReport = z.infer<typeof engineBranchPinReportSchema>;

/**
 * Every conditional router's branch counts, under the virtual model and the gateway serving it.
 *
 * @summary Keyed exactly like traffic, so one gateway's routers can be dropped whole when it stops
 * and a router that never judged anything is simply absent rather than counted at nothing. The
 * router sits between the model and its counts because two routers under one model each hold their
 * own conversations, and flattening them would add two unrelated tallies into one wrong number.
 */
export const gatewayBranchPinsSchema = z.record(
  gatewaySlugSchema,
  z.record(gatewaySlugSchema, z.record(routeNodeIdSchema, branchPinTallySchema)),
);

export type GatewayBranchPins = z.infer<typeof gatewayBranchPinsSchema>;
