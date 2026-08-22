import { z } from 'zod';

import { keyCheckVerdictSchema } from './api-keys';
import {
  keyCustodySchema,
  lookCustodySchema,
  modelListingSchema,
  subscriptionCustodySchema,
} from './engine-custody';
import { logRowSchema } from './engine-logs';
import { engineRoutingSchema } from './engine-routing';
import { gatewayEngineStateSchema } from './engine-state';
import { requestOutcomeSchema } from './engine-traffic';
import { gatewayPortSchema, gatewaySlugSchema, modelAliasSchema } from './gateway-config';
import { routeNodeIdSchema } from './gateway-routing';
import {
  localProviderIdSchema,
  loopbackAddressSchema,
  runtimeReachabilitySchema,
} from './local-runtimes';
import { nonBlankString } from './non-blank';
import { providerDialectSchema } from './provider-directory';
import { gatewayBindAddressSchema } from './settings';
import { subscriptionProviderIdSchema } from './subscriptions';

/**
 * One virtual model as the child serves it: the id a client sends, and where the request goes.
 *
 * @summary The id reads the alias vocabulary rather than the gateway's, the way a log row and a
 * branch tally already do: an alias keeps the dots a real model name carries, so `claude-5.6-sol`
 * crosses to the child instead of being refused at the start directive and taking the whole gateway
 * down with it.
 */
export const engineVirtualModelSchema = z.strictObject({
  id: modelAliasSchema,
  displayName: nonBlankString,
  routing: engineRoutingSchema,
});

export type EngineVirtualModel = z.infer<typeof engineVirtualModelSchema>;

/**
 * The gateway a start directive stands up, as the child sees it.
 *
 * @summary The key arrives only where the gateway enforces it. The parent reads the requirement off
 * the stored document and leaves the field out otherwise, so the child never holds a secret it must
 * not act on, and its guard mounts on presence alone rather than on a second flag.
 */
export const engineGatewaySchema = z.strictObject({
  slug: gatewaySlugSchema,
  displayName: z.string().trim().min(1),
  port: gatewayPortSchema,
  bindAddress: gatewayBindAddressSchema.optional(),
  apiKey: nonBlankString.optional(),
  virtualModels: z.array(engineVirtualModelSchema),
});

export type EngineGateway = z.infer<typeof engineGatewaySchema>;

export const directiveIdSchema = z.string().trim().min(1);

export const engineDirectiveSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('start'),
    id: directiveIdSchema,
    gateway: engineGatewaySchema,
  }),
  z.strictObject({ kind: z.literal('stop'), id: directiveIdSchema, slug: gatewaySlugSchema }),
  z.strictObject({
    kind: z.literal('probe'),
    id: directiveIdSchema,
    origin: nonBlankString,
    custody: keyCustodySchema,
  }),
  z.strictObject({
    kind: z.literal('probe-runtime'),
    id: directiveIdSchema,
    address: loopbackAddressSchema,
    provider: localProviderIdSchema,
  }),
  z.strictObject({
    kind: z.literal('list-models'),
    id: directiveIdSchema,
    origin: nonBlankString,
    custody: lookCustodySchema,
  }),
  /**
   * @summary The address a Claude account signed in as lives only at the far end, so learning it
   * is a request like any other and travels the lane every request travels: the credential reaches
   * the child and nothing else, the way a model list already does.
   */
  z.strictObject({
    kind: z.literal('claude-address'),
    id: directiveIdSchema,
    accessToken: nonBlankString,
  }),
]);

export type EngineDirective = z.infer<typeof engineDirectiveSchema>;

export const engineReportSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('state'),
    answers: directiveIdSchema,
    slug: gatewaySlugSchema,
    state: gatewayEngineStateSchema,
  }),
  z.strictObject({
    kind: z.literal('key-check'),
    answers: directiveIdSchema,
    verdict: keyCheckVerdictSchema,
    status: z.number().int().optional(),
  }),
  z.strictObject({
    kind: z.literal('runtime-check'),
    answers: directiveIdSchema,
    reachability: runtimeReachabilitySchema,
  }),
  z.strictObject({
    kind: z.literal('model-list'),
    answers: directiveIdSchema,
    listing: modelListingSchema,
  }),
  z.strictObject({
    kind: z.literal('claude-address'),
    answers: directiveIdSchema,
    address: nonBlankString.optional(),
  }),
]);

export type EngineReport = z.infer<typeof engineReportSchema>;

/**
 * What the child says on its own once a request through one virtual model has finished.
 *
 * @summary It answers no directive, because nothing asked: the child speaks the moment a request
 * lands, and the parent folds the latest word per route node into the snapshot the canvas paints
 * its cables from. One request walking a ladder speaks once per attempt, so the child that turned
 * the request away and the one that answered it each light their own cable.
 *
 * The model reads the alias vocabulary rather than the gateway's, so a cable under
 * `claude-5.6-sol` files under the very id the client sent rather than bouncing off the lane.
 */
export const engineTrafficReportSchema = z.strictObject({
  kind: z.literal('traffic'),
  slug: gatewaySlugSchema,
  virtualModel: modelAliasSchema,
  routeNode: routeNodeIdSchema,
  request: requestOutcomeSchema,
});

export type EngineTrafficReport = z.infer<typeof engineTrafficReportSchema>;

/**
 * What the child says on its own once one request has been logged.
 *
 * @summary It answers no directive for the same reason traffic does not: the child speaks the
 * moment a request finishes. One report carries one row, and the logs desk in the parent gathers
 * the reports into the batches the renderer reads, so no row waits on another to cross.
 */
export const engineLogReportSchema = z.strictObject({
  kind: z.literal('log'),
  row: logRowSchema,
});

export type EngineLogReport = z.infer<typeof engineLogReportSchema>;

/**
 * The child asking the parent for custody of one attempt.
 *
 * @summary It names the route node it is about to try rather than the virtual model alone, because
 * a ladder spends a different account per child and only the parent may turn a route node id into a
 * credential. The model reads the alias vocabulary rather than the gateway's, so an ask under
 * `claude-5.6-sol` reaches the parent instead of throwing inside the lane that sent it.
 */
export const engineSpendRequestSchema = z.strictObject({
  kind: z.literal('spend-request'),
  id: directiveIdSchema,
  slug: gatewaySlugSchema,
  virtualModel: modelAliasSchema,
  routeNode: routeNodeIdSchema,
});

export type EngineSpendRequest = z.infer<typeof engineSpendRequestSchema>;

const grantedSpendSchema = z.discriminatedUnion('custody', [
  z.strictObject({
    custody: z.literal('credentialed'),
    provider: nonBlankString,
    credential: nonBlankString,
    accountId: nonBlankString.optional(),
    isCompat: z.boolean().optional(),
    dialect: providerDialectSchema.optional(),
  }),
  subscriptionCustodySchema,
  z.strictObject({ custody: z.literal('open') }),
]);

export const spendGrantSchema = z.discriminatedUnion('verdict', [
  z.strictObject({
    verdict: z.literal('resolved'),
    providerOrigin: nonBlankString,
    spend: grantedSpendSchema,
  }),
  z.strictObject({ verdict: z.literal('missing-target') }),
  z.strictObject({ verdict: z.literal('missing-credential') }),
]);

export type SpendGrant = z.infer<typeof spendGrantSchema>;

export const engineSpendGrantSchema = z.strictObject({
  kind: z.literal('spend-grant'),
  answers: directiveIdSchema,
  grant: spendGrantSchema,
});

export type EngineSpendGrant = z.infer<typeof engineSpendGrantSchema>;

export const engineSubscriptionCredentialUpdateSchema = z.strictObject({
  kind: z.literal('subscription-credential-update'),
  id: directiveIdSchema,
  provider: subscriptionProviderIdSchema,
  accountId: nonBlankString,
  credential: nonBlankString,
});

export type EngineSubscriptionCredentialUpdate = z.infer<
  typeof engineSubscriptionCredentialUpdateSchema
>;

export const engineSubscriptionCredentialUpdatedSchema = z.strictObject({
  kind: z.literal('subscription-credential-updated'),
  answers: directiveIdSchema,
  verdict: z.enum(['stored', 'failed']),
});

export type EngineSubscriptionCredentialUpdated = z.infer<
  typeof engineSubscriptionCredentialUpdatedSchema
>;
