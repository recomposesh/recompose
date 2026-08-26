import { z } from 'zod';

import { keyProviderIdSchema } from './api-keys';
import { nonBlankString } from './non-blank';
import { subscriptionProviderIdSchema } from './subscriptions';
import { accountTransportPolicySchema } from './transport-policy';

/**
 * How a credential is spelled on its way to the child, and what a look at a catalog answered.
 *
 * @summary These stand apart from the directives that carry them because both processes read
 * them for more than one errand: a key check, a model list and a serving turn all ask the same
 * question about the same account, and one answer to it keeps the three from drifting.
 */

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
const providerKeyCustodySchema = z.strictObject({
  custody: z.literal('provider-key'),
  provider: keyProviderIdSchema,
  credential: nonBlankString,
});

const bearerCustodySchema = z.strictObject({
  custody: z.literal('bearer'),
  provider: nonBlankString,
  credential: nonBlankString,
});

/**
 * How a look carrying a key a person pasted spells that key, whoever the vendor is.
 *
 * @summary A key check reaches the same catalog a model list reaches, so it rides the same two
 * arms rather than a list of vendors of its own. The narrower union is what a check takes, because
 * a runtime carrying nothing and a plan renewing itself are neither of them a pasted key.
 */
export const keyCustodySchema = z.discriminatedUnion('custody', [
  providerKeyCustodySchema,
  bearerCustodySchema,
]);

export type KeyCustody = z.infer<typeof keyCustodySchema>;

export const lookCustodySchema = z.discriminatedUnion('custody', [
  providerKeyCustodySchema,
  bearerCustodySchema,
  z.strictObject(subscriptionCustodyShape),
  z.strictObject({ custody: z.literal('open') }),
]);

export type LookCustody = z.infer<typeof lookCustodySchema>;

/**
 * One model an account serves, beside the date its provider announced for shutting it down.
 *
 * @summary The date rides the listing the account already answers with, so recompose holds no list
 * of retiring models and nothing needs a release when one retires. A provider publishing no such
 * field leaves every entry dateless, which reads the same as a provider announcing nothing.
 */
export const listedModelSchema = z.strictObject({
  id: nonBlankString,
  shutdownDate: nonBlankString.optional(),
});

export type ListedModel = z.infer<typeof listedModelSchema>;

/**
 * What one look at an account's model list read: what it serves, or that nothing could be read.
 *
 * @summary The unlisted arm carries no words, because a person reads the sentence the screen owns
 * rather than one the engine invented. An account that answered with nothing still stands as
 * listed, so a catalog that is genuinely empty never reads as a look that failed. Each model
 * carries its own shutdown date rather than the listing carrying a second roll of retiring ids,
 * because one collection cannot fall out of step with itself.
 */
export const modelListingSchema = z.discriminatedUnion('standing', [
  z.strictObject({ standing: z.literal('listed'), models: z.array(listedModelSchema) }),
  z.strictObject({ standing: z.literal('unlisted') }),
]);

export type ModelListing = z.infer<typeof modelListingSchema>;

export const subscriptionCustodySchema = z.strictObject(subscriptionCustodyShape);
