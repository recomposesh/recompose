import { z } from 'zod';

import { nonBlankString } from './non-blank';

/**
 * The plans a tool on the machine signs into on recompose's behalf.
 *
 * @summary Each one ships a command-line tool that owns its flow, so recompose runs that tool
 * rather than keeping a second copy of an authorization it would then have to maintain.
 */
export const toolBackedProviderIdSchema = z.enum(['anthropic', 'openai']);

export type ToolBackedProviderId = z.infer<typeof toolBackedProviderIdSchema>;

/**
 * Every plan a subscription account can stand for.
 *
 * @summary Three of these stand apart: nothing on the machine owns their flow, so recompose runs
 * the authorization itself. Keeping them out of the tool table means the compiler asks every
 * tool-delegating path what it does about the plans that have no tool to delegate to.
 */
export const subscriptionProviderIdSchema = z.enum([
  ...toolBackedProviderIdSchema.options,
  'antigravity',
  'kimi',
  'copilot',
]);

export type SubscriptionProviderId = z.infer<typeof subscriptionProviderIdSchema>;

/**
 * How a tool is told which config home to use.
 *
 * @summary Both tools this app delegates to read an environment variable, so pointing one at a home
 * is one assignment in front of the command. It stays a named shape rather than a bare string
 * because a tool that reads a config file instead is a shape this app has already met.
 */
export type ToolConfigHome = { told: 'environment'; variable: string };

/**
 * The tools each provider delegates to, and the runs those tools answer.
 *
 * @summary `renewArguments` names the run that makes a tool rotate the credential it owns and
 * exit. Claude Code renews behind `auth status`, which reports the signed-in account and so has to
 * hold a token the provider still accepts. Codex names none: `login status` and `doctor` both read
 * the record without touching it, and only a spent turn renews, which is no price for a background
 * refresh. An empty list means the app leaves such a credential exactly as it stands.
 */
export const subscriptionProviders = {
  anthropic: {
    toolBinary: 'claude',
    toolName: 'Claude Code',
    configHome: { told: 'environment', variable: 'CLAUDE_CONFIG_DIR' },
    signInArguments: [],
    renewArguments: ['auth', 'status'],
  },
  openai: {
    toolBinary: 'codex',
    toolName: 'Codex',
    configHome: { told: 'environment', variable: 'CODEX_HOME' },
    signInArguments: ['login'],
    renewArguments: [],
  },
} as const satisfies Record<
  ToolBackedProviderId,
  {
    toolBinary: string;
    toolName: string;
    configHome: ToolConfigHome;
    signInArguments: readonly string[];
    renewArguments: readonly string[];
  }
>;

/** The name every plan goes by on screen, including the ones no tool signs into. */
export const subscriptionPlanNames: Record<SubscriptionProviderId, string> = {
  anthropic: subscriptionProviders.anthropic.toolName,
  openai: subscriptionProviders.openai.toolName,
  antigravity: 'Gemini (Antigravity)',
  kimi: 'Kimi Code',
  copilot: 'GitHub Copilot',
};

/**
 * Whether a tool on the machine owns this plan's sign-in, which decides who runs it.
 *
 * @summary Reach for it wherever a path is about to run a tool, read a config home, or ask a tool
 * to renew. Every plan recompose signs into itself answers no to all three.
 */
export function toolBacked(provider: SubscriptionProviderId): provider is ToolBackedProviderId {
  return toolBackedProviderIdSchema.safeParse(provider).success;
}

/**
 * The plans recompose signs into by showing a code a person types somewhere else.
 *
 * @summary They share one channel because RFC 8628 fixes the whole exchange and leaves the vendor
 * only its addresses. Naming them as a set is what lets the compiler refuse a provider on that
 * channel that authorizes some other way.
 */
export const deviceFlowProviderIdSchema = z.enum(['copilot', 'kimi']);

export type DeviceFlowProviderId = z.infer<typeof deviceFlowProviderIdSchema>;

export function signsInByDeviceCode(
  provider: SubscriptionProviderId,
): provider is DeviceFlowProviderId {
  return deviceFlowProviderIdSchema.safeParse(provider).success;
}

/**
 * The plans recompose signs into by handing the account's own browser an address.
 *
 * @summary Google redirects rather than answering, so this sign-in is one act with nothing to show
 * in between. It stays a set rather than a single word because the channel it names is shaped by
 * the redirect, not by the one vendor that currently uses it.
 */
export const browserSignInProviderIdSchema = z.enum(['antigravity']);

export type BrowserSignInProviderId = z.infer<typeof browserSignInProviderIdSchema>;

export function signsInThroughTheBrowser(
  provider: SubscriptionProviderId,
): provider is BrowserSignInProviderId {
  return browserSignInProviderIdSchema.safeParse(provider).success;
}

export const subscriptionStandingSchema = z.enum(['connected', 'lapsed']);

/**
 * Where a connected subscription account came from.
 *
 * @summary A sign-in the app ran lives in a config home the app alone reads, so the app renews it
 * and offers to sign in again when it lapses. An account adopted from the machine belongs to the
 * provider's own tool as well, so the app renews nothing and names that tool as the way back.
 */
export const subscriptionProvenanceSchema = z.enum(['sign-in', 'machine']);

export type SubscriptionProvenance = z.infer<typeof subscriptionProvenanceSchema>;

export const subscriptionAccountViewSchema = z.strictObject({
  id: nonBlankString,
  provider: subscriptionProviderIdSchema,
  label: z.string().trim().min(1),
  signedInAs: nonBlankString.optional(),
  plan: nonBlankString.optional(),
  standing: subscriptionStandingSchema,
  active: z.boolean(),
  provenance: subscriptionProvenanceSchema,
});

export type SubscriptionAccountView = z.infer<typeof subscriptionAccountViewSchema>;

/**
 * What the app found when it looked at the credential store the provider's own tool writes.
 *
 * @summary The four arms stay apart on purpose: a store that refused to open is not an empty
 * machine, and a record carrying no account credential is not one either. No arm carries credential
 * material, because this report crosses to the screen before a person has acted on it, and only an
 * act may read the material itself.
 */
export const machineCredentialReadingSchema = z.discriminatedUnion('holds', [
  z.strictObject({
    holds: z.literal('account'),
    signedInAs: nonBlankString.optional(),
    plan: nonBlankString.optional(),
    standing: subscriptionStandingSchema,
  }),
  z.strictObject({ holds: z.literal('nothing') }),
  z.strictObject({ holds: z.literal('no-account-credential') }),
  z.strictObject({ holds: z.literal('store-refused') }),
]);

export type MachineCredentialReading = z.infer<typeof machineCredentialReadingSchema>;

/**
 * One tool this app can hand a sign-in to, and how a person reaches it themselves.
 */
export const subscriptionToolSchema = z.strictObject({
  provider: toolBackedProviderIdSchema,
  toolName: nonBlankString,
  present: z.boolean(),
  signInCommand: nonBlankString,
  shellSetupLine: nonBlankString,
});

export type SubscriptionTool = z.infer<typeof subscriptionToolSchema>;
