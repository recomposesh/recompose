import { z } from 'zod';

import { nonBlankString } from './non-blank';

export const subscriptionProviderIdSchema = z.enum(['anthropic', 'openai', 'antigravity']);

export type SubscriptionProviderId = z.infer<typeof subscriptionProviderIdSchema>;

export const subscriptionProviders = {
  anthropic: {
    toolBinary: 'claude',
    toolName: 'Claude Code',
    configHomeVariable: 'CLAUDE_CONFIG_DIR',
    signInArguments: [],
  },
  openai: {
    toolBinary: 'codex',
    toolName: 'Codex',
    configHomeVariable: 'CODEX_HOME',
    signInArguments: ['login'],
  },
  antigravity: {
    toolBinary: 'cliproxyapi',
    toolName: 'Gemini (Antigravity)',
    configHomeVariable: 'CLIPROXYAPI_HOME',
    signInArguments: ['--antigravity-login'],
  },
} as const satisfies Record<
  SubscriptionProviderId,
  {
    toolBinary: string;
    toolName: string;
    configHomeVariable: string;
    signInArguments: readonly string[];
  }
>;

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

export const subscriptionToolSchema = z.strictObject({
  provider: subscriptionProviderIdSchema,
  toolName: nonBlankString,
  present: z.boolean(),
  signInCommand: nonBlankString,
  shellSetupLine: nonBlankString,
});

export type SubscriptionTool = z.infer<typeof subscriptionToolSchema>;
