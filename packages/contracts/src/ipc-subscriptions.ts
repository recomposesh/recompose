import { z } from 'zod';

import { ipcResult } from './ipc-result';
import { nonBlankString } from './non-blank';
import {
  machineCredentialReadingSchema,
  subscriptionAccountViewSchema,
  subscriptionProviderIdSchema,
  subscriptionToolSchema,
} from './subscriptions';

const subscriptionViewsResponse = ipcResult(z.array(subscriptionAccountViewSchema));

/**
 * Every channel a subscription travels, gathered apart from the rest of the surface.
 *
 * @summary They stand together because they answer one question: what plan is connected, and how
 * did it get that way. The rest of the surface asks about gateways, keys, usage and the system.
 */
export const subscriptionChannels = {
  'subscriptions:list': { request: z.void(), response: subscriptionViewsResponse },
  'subscriptions:tools': {
    request: z.void(),
    response: ipcResult(z.array(subscriptionToolSchema)),
  },
  'subscriptions:sign-in': {
    request: z.strictObject({ provider: subscriptionProviderIdSchema }),
    response: subscriptionViewsResponse,
  },
  /**
   * Asks GitHub for the code a person enters, and answers what to show them.
   *
   * @summary The handle that completes the flow never crosses, so the renderer holds nothing that
   * could finish a sign-in it did not start.
   */
  'subscriptions:copilot-code': {
    request: z.void(),
    response: ipcResult(z.strictObject({ userCode: nonBlankString, verificationUri: z.url() })),
  },
  /** Waits on the code a person was shown, answering the accounts once it settles. */
  'subscriptions:copilot-await': {
    request: z.void(),
    response: subscriptionViewsResponse,
  },
  'subscriptions:restore': {
    request: z.strictObject({ id: nonBlankString }),
    response: subscriptionViewsResponse,
  },
  'subscriptions:activate': {
    request: z.strictObject({ id: nonBlankString }),
    response: subscriptionViewsResponse,
  },
  /**
   * Asks main what the provider's own tool already left on this machine.
   *
   * @summary The answer names the account and how its credential stands, and carries none of the
   * material, because reading the material can ask the operating system for permission and a prompt
   * belongs to something a person did. A person's pick causes this read; a mount never does.
   */
  'subscriptions:detect': {
    request: z.strictObject({ provider: subscriptionProviderIdSchema }),
    response: ipcResult(machineCredentialReadingSchema),
  },
  /**
   * Records the account the machine already holds, with no sign-in.
   *
   * @summary Main re-reads the material under this act and refuses `nothing-to-adopt` when the
   * credential left the store between the look and the click.
   */
  'subscriptions:adopt': {
    request: z.strictObject({ provider: subscriptionProviderIdSchema }),
    response: subscriptionViewsResponse,
  },
} as const;
