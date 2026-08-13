import { z } from 'zod';

import { nonBlankString } from './non-blank';

/**
 * The plans a tool on the machine signs into on recompose's behalf.
 *
 * @summary Each one ships a command-line tool that owns its flow, so recompose runs that tool
 * rather than keeping a second copy of an authorization it would then have to maintain.
 */
export const toolBackedProviderIdSchema = z.enum(['anthropic', 'openai', 'antigravity', 'kimi']);

export type ToolBackedProviderId = z.infer<typeof toolBackedProviderIdSchema>;

/**
 * Every plan a subscription account can stand for.
 *
 * @summary GitHub Copilot stands apart from the rest: nothing on the machine owns its flow, so
 * recompose runs the device authorization itself. Keeping it out of the tool table means the
 * compiler asks every tool-delegating path what it does about the one plan that has no tool.
 */
export const subscriptionProviderIdSchema = z.enum([
  ...toolBackedProviderIdSchema.options,
  'copilot',
]);

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
  kimi: {
    toolBinary: 'cliproxyapi',
    toolName: 'Kimi Code',
    configHomeVariable: 'CLIPROXYAPI_HOME',
    signInArguments: ['--kimi-login'],
  },
} as const satisfies Record<
  ToolBackedProviderId,
  {
    toolBinary: string;
    toolName: string;
    configHomeVariable: string;
    signInArguments: readonly string[];
  }
>;

/** The name every plan goes by on screen, including the one no tool signs into. */
export const subscriptionPlanNames: Record<SubscriptionProviderId, string> = {
  anthropic: subscriptionProviders.anthropic.toolName,
  openai: subscriptionProviders.openai.toolName,
  antigravity: subscriptionProviders.antigravity.toolName,
  kimi: subscriptionProviders.kimi.toolName,
  copilot: 'GitHub Copilot',
};

/**
 * Whether a tool on the machine owns this plan's sign-in, which decides who runs it.
 *
 * @summary Reach for it wherever a path is about to run a tool, read a config home, or ask a tool
 * to renew. GitHub Copilot answers no to all three, because recompose owns its flow itself.
 */
export function toolBacked(provider: SubscriptionProviderId): provider is ToolBackedProviderId {
  return toolBackedProviderIdSchema.safeParse(provider).success;
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

export const subscriptionToolSchema = z.strictObject({
  provider: subscriptionProviderIdSchema,
  toolName: nonBlankString,
  present: z.boolean(),
  signInCommand: nonBlankString,
  shellSetupLine: nonBlankString,
});

export type SubscriptionTool = z.infer<typeof subscriptionToolSchema>;
