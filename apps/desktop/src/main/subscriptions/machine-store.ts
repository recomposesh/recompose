import type { SubscriptionProviderId } from '@recompose/contracts';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CredentialCustody } from './credential-custody';
import type { MachineStore } from './machine-credential';

import { custodyOver } from './credential-custody';
import { credentialFactsFor } from './credential-records';

/**
 * Everything the machine's own stores are reached through.
 *
 * @summary The custody arrives whole rather than narrowed, so no caller can hand Claude Code's
 * keychain item to the reader for a different vendor.
 */
export type MachineReach = {
  homeFolder: string;
  platform: NodeJS.Platform;
  custody: CredentialCustody | null;
  /** Reads the keyring Codex keeps its record in on a machine that holds it there. */
  keyringHolds: (() => Promise<string | null>) | null;
};

async function fileAt(path: string): Promise<string | null> {
  return readFile(path, 'utf8').then(
    (found) => found,
    () => null,
  );
}

function expiryOf(provider: SubscriptionProviderId, blob: string): number {
  const { expiresAt } = credentialFactsFor(provider, blob, null);

  return expiresAt ?? 0;
}

/**
 * @summary Two stores can hold the same account and disagree, because one tool wrote the keychain
 * and another wrote the file. Answering with whichever replied first would serve a credential the
 * owning tool already rotated past, so the fresher expiry wins.
 */
function fresher(
  provider: SubscriptionProviderId,
  held: readonly (string | null)[],
): string | null {
  const standing = held.filter((blob): blob is string => blob !== null);

  return standing.reduce<string | null>(
    (best, blob) =>
      best === null || expiryOf(provider, blob) > expiryOf(provider, best) ? blob : best,
    null,
  );
}

async function codexBlob(reach: MachineReach): Promise<string | null> {
  const inFile = await fileAt(join(reach.homeFolder, '.codex', 'auth.json'));

  if (inFile !== null || reach.keyringHolds === null) {
    return inFile;
  }

  return reach.keyringHolds();
}

async function claudeBlob(reach: MachineReach): Promise<string | null> {
  const custody = custodyOver(reach.custody, 'anthropic');
  const inFile = await fileAt(join(reach.homeFolder, '.claude', '.credentials.json'));

  if (reach.platform !== 'darwin' || custody === null) {
    return inFile;
  }

  return fresher('anthropic', [await custody.readMachineItem(), inFile]);
}

/**
 * @summary Where each provider's own tool keeps what it wrote, which is never inside a home this
 * app made. Claude Code keeps its credential in the login keychain on macOS and in its config home
 * elsewhere, while the address and the plan sit in a plain file either way.
 */
export function machineStoreFor(
  provider: SubscriptionProviderId,
  reach: MachineReach,
): MachineStore {
  if (provider === 'openai') {
    return {
      readBlob: async () => codexBlob(reach),
      readIdentity: async () => Promise.resolve(null),
    };
  }

  return {
    readBlob: async () => claudeBlob(reach),
    readIdentity: async () => fileAt(join(reach.homeFolder, '.claude.json')),
  };
}
