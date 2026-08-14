import { z } from 'zod';

import { routeNodeIdSchema, routerPolicySchema } from './gateway-routing';
import { nonBlankString } from './non-blank';

const targetStandingSchema = z.discriminatedUnion('standing', [
  z.strictObject({ standing: z.literal('bound'), providerModel: nonBlankString }),
  z.strictObject({ standing: z.literal('removed') }),
]);

/**
 * One node of a route table as the child sees it: a target worn down to its standing, or a router.
 *
 * @summary The stored target names the account paying for it, and that name never crosses the lane.
 * The parent resolves custody per attempt against live storage, so the child holds a seat name and
 * nothing it could spend. A router mirrors whole, because its mode and its declared order are the
 * walk's entire instruction.
 */
const engineRouteNodeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('target'), standing: targetStandingSchema }),
  z.strictObject({
    kind: z.literal('router'),
    displayName: nonBlankString.optional(),
    policy: routerPolicySchema,
    children: z.array(routeNodeIdSchema),
  }),
]);

export type EngineRouteNode = z.infer<typeof engineRouteNodeSchema>;

export type EngineTargetStanding = Extract<EngineRouteNode, { kind: 'target' }>['standing'];

/**
 * The table one virtual model serves through, as the child sees it.
 *
 * @summary It mirrors the stored table id for id, so a seat name means the same thing on both sides
 * of the lane. It walks nothing of its own, because the parent mints it from a table the stored
 * parse already proved servable.
 */
export const engineRoutingSchema = z.strictObject({
  entry: routeNodeIdSchema,
  nodes: z.record(routeNodeIdSchema, engineRouteNodeSchema),
});

export type EngineRouting = z.infer<typeof engineRoutingSchema>;
