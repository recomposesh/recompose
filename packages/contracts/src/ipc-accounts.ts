import { z } from 'zod';

import {
  accountEndpointSchema,
  accountsDocumentSchema,
  credentialedAccountKindSchema,
} from './accounts';
import { keyCheckReportSchema, pastedKeySchema } from './api-keys';
import { modelListingSchema } from './engine-custody';
import { ipcResult } from './ipc-result';
import {
  localProviderIdSchema,
  runtimePortSchema,
  runtimeReachabilitySchema,
} from './local-runtimes';
import { nonBlankString } from './non-blank';

export const connectAccountRequestSchema = z.strictObject({
  provider: nonBlankString,
  kind: credentialedAccountKindSchema,
  label: z.string().trim().min(1),
  secret: pastedKeySchema,
  /**
   * A key this account reads its balance with, offered where the vendor gates the read behind one.
   *
   * @summary Optional, because the account serves requests either way and only the balance card
   * reaches for it. A person leaving the field empty offers nothing rather than offering a blank,
   * which is why no empty string may cross.
   */
  readerSecret: pastedKeySchema.optional(),
  endpoint: accountEndpointSchema.optional(),
});

/**
 * Whether a look at a server carries the port it needs.
 *
 * @summary A documented runtime falls back to the port its own project publishes. A server nobody
 * documents has no port to fall back to, so a request that names none would aim the look at
 * nothing.
 */
function namesItsOwnPort(asked: { runtime: string; port?: number | undefined }): boolean {
  return asked.runtime !== 'custom' || asked.port !== undefined;
}

const registryResponse = ipcResult(accountsDocumentSchema);

/**
 * Every channel an account travels, gathered apart from the rest of the surface.
 *
 * @summary They stand together because they answer one question: which providers this install can
 * reach, and what each one was stored with. The rest of the surface asks about gateways, the
 * engine, usage and the system.
 */
export const accountChannels = {
  'accounts:list': { request: z.void(), response: registryResponse },
  'accounts:connect': { request: connectAccountRequestSchema, response: registryResponse },
  'accounts:remove': {
    request: z.strictObject({ id: nonBlankString }),
    response: registryResponse,
  },
  'accounts:check-key': {
    request: z.strictObject({ id: nonBlankString }),
    response: ipcResult(keyCheckReportSchema),
  },
  /**
   * Holds a read-only key against a stored row, on an account that already exists.
   *
   * @summary Every account connected before this channel existed holds no reader key, so adding
   * one has to be reachable without disconnecting and reconnecting the account. It stands apart
   * from `accounts:connect` because the key it carries never replaces the one requests are served
   * with, and apart from clearing because a request that names no key must never be read as one
   * asking to forget the key already held.
   */
  'accounts:set-reader-key': {
    request: z.strictObject({ id: nonBlankString, secret: pastedKeySchema }),
    response: registryResponse,
  },
  /** Forgets the read-only key a stored row held, leaving everything else about the row alone. */
  'accounts:clear-reader-key': {
    request: z.strictObject({ id: nonBlankString }),
    response: registryResponse,
  },
  'accounts:connect-local': {
    request: z
      .strictObject({
        runtime: localProviderIdSchema,
        port: runtimePortSchema.optional(),
        label: z.string().trim().min(1).optional(),
      })
      .refine(namesItsOwnPort, 'a server nobody documents must name its own port')
      .refine(
        (asked) => asked.runtime !== 'custom' || asked.label !== undefined,
        'a server nobody documents must carry the name a person gave it',
      ),
    response: registryResponse,
  },
  'accounts:detect-runtime': {
    request: z
      .strictObject({
        runtime: localProviderIdSchema,
        port: runtimePortSchema.optional(),
      })
      .refine(namesItsOwnPort, 'a server nobody documents must name its own port'),
    response: ipcResult(runtimeReachabilitySchema),
  },
  'accounts:check-runtime': {
    request: z.strictObject({ id: nonBlankString }),
    response: ipcResult(runtimeReachabilitySchema),
  },
  /**
   * Points a stored runtime at another port, without taking the row away and putting it back.
   *
   * @summary A server's port is not a fact about the row, it is where the server happens to answer
   * today, and a moved `OLLAMA_HOST` used to mean removing the row and adding it again. It names
   * the row rather than the runtime, because only a row has somewhere to move from, and it carries
   * a port rather than an address, because the app mints the address the same way an add does.
   */
  'accounts:move-runtime': {
    request: z.strictObject({ id: nonBlankString, port: runtimePortSchema }),
    response: registryResponse,
  },
  'accounts:list-models': {
    request: z.strictObject({ id: nonBlankString }),
    response: ipcResult(modelListingSchema),
  },
} as const;
