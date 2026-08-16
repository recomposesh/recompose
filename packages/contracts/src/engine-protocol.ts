import { z } from 'zod';

import { keyCheckVerdictSchema, keyProviderIdSchema } from './api-keys';
import { logRowSchema } from './engine-logs';
import { engineRoutingSchema } from './engine-routing';
import { gatewayEngineStateSchema } from './engine-state';
import { requestOutcomeSchema } from './engine-traffic';
import { gatewayPortSchema, gatewaySlugSchema } from './gateway-config';
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
import { accountTransportPolicySchema } from './transport-policy';

export const engineVirtualModelSchema = z.strictObject({
  id: gatewaySlugSchema,
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

/**
 * Who spends the refresh token when a subscription credential nears expiry.
 *
 * @summary Both vendors rotate the refresh token on every renewal and reject the one that went
 * before, so a second renewer signs the person out of their own tool. The parent resolves this from
 * the stored account and stamps it on the grant, and the child obeys the answer rather than
 * inferring one it has no way to know.
 */
export const subscriptionRenewalOwnerSchema = z.enum(['app', 'owning-tool']);

export type SubscriptionRenewalOwner = z.infer<typeof subscriptionRenewalOwnerSchema>;

const subscriptionCustodyShape = {
  custody: z.literal('subscription'),
  provider: subscriptionProviderIdSchema,
  accountId: nonBlankString,
  credential: nonBlankString,
  renewal: subscriptionRenewalOwnerSchema,
  transportPolicy: accountTransportPolicySchema.optional(),
};

/**
 * How a look at a provider's model list spells the credential it was handed, or that it has none.
 *
 * @summary A first-party key rides the header its own vendor reads, which is why the arm names the
 * provider: Anthropic answers `x-api-key` beside its version and turns a bearer token away. Every
 * other credentialed account is an OpenAI-compatible bearer, and a runtime on this machine carries
 * nothing at all. Main resolves the arm from the stored account; the child spells the header.
 */
export const lookCustodySchema = z.discriminatedUnion('custody', [
  z.strictObject({
    custody: z.literal('provider-key'),
    provider: keyProviderIdSchema,
    credential: nonBlankString,
  }),
  z.strictObject({
    custody: z.literal('bearer'),
    provider: nonBlankString,
    credential: nonBlankString,
  }),
  z.strictObject(subscriptionCustodyShape),
  z.strictObject({ custody: z.literal('open') }),
]);

export type LookCustody = z.infer<typeof lookCustodySchema>;

/**
 * What one look at an account's model list read: the ids it serves, or that nothing could be read.
 *
 * @summary The unlisted arm carries no words, because a person reads the sentence the screen owns
 * rather than one the engine invented. An account that answered with no ids still stands as listed,
 * so a catalog that is genuinely empty never reads as a look that failed.
 */
export const modelListingSchema = z.discriminatedUnion('standing', [
  z.strictObject({ standing: z.literal('listed'), modelIds: z.array(nonBlankString) }),
  z.strictObject({ standing: z.literal('unlisted') }),
]);

export type ModelListing = z.infer<typeof modelListingSchema>;

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
    provider: keyProviderIdSchema,
    key: nonBlankString,
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
 */
export const engineTrafficReportSchema = z.strictObject({
  kind: z.literal('traffic'),
  slug: gatewaySlugSchema,
  virtualModel: gatewaySlugSchema,
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
 * credential.
 */
export const engineSpendRequestSchema = z.strictObject({
  kind: z.literal('spend-request'),
  id: directiveIdSchema,
  slug: gatewaySlugSchema,
  virtualModel: gatewaySlugSchema,
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
  z.strictObject(subscriptionCustodyShape),
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
