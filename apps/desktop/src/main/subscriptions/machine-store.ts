import type { SubscriptionProviderId } from '@recompose/contracts';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CredentialCustody, KeychainSeam } from './credential-custody';
import type { MachineStore } from './machine-credential';

import { credentialFactsFor, documentIn } from './credential-records';

export type MachineStoreRequest = {
  provider: SubscriptionProviderId;
  homeFolder: string;
  platform: NodeJS.Platform;
  custody: CredentialCustody | null;
  /** Reads the keyring Codex uses when it keeps its record there rather than in a file. */
  keychain?: KeychainSeam | null;
  osUser?: string;
};

const CODEX_KEYRING_SERVICE = 'Codex Auth';

async function fileAt(path: string): Promise<string | null> {
  return readFile(path, 'utf8').then(
    (found) => found,
    () => null,
  );
}

function expiryOf(provider: SubscriptionProviderId, blob: string): number {
  const { expiresAt } = credentialFactsFor(provider, documentIn(blob), null);

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

async function codexBlob(request: MachineStoreRequest): Promise<string | null> {
  const inFile = await fileAt(join(request.homeFolder, '.codex', 'auth.json'));

  if (inFile !== null || request.keychain === null || request.keychain === undefined) {
    return inFile;
  }

  return request.keychain.read({
    service: CODEX_KEYRING_SERVICE,
    account: request.osUser ?? '',
  });
}

async function claudeBlob(request: MachineStoreRequest): Promise<string | null> {
  const inFile = await fileAt(join(request.homeFolder, '.claude', '.credentials.json'));

  if (request.platform !== 'darwin' || request.custody === null) {
    return inFile;
  }

  return fresher('anthropic', [await request.custody.readMachineItem(), inFile]);
}

/**
 * @summary Where each provider's own tool keeps what it wrote, which is never inside a home this
 * app made. Claude Code keeps its credential in the login keychain on macOS and in its config home
 * elsewhere, while the address and the plan sit in a plain file either way.
 */
export function machineStoreFor(request: MachineStoreRequest): MachineStore {
  if (request.provider === 'openai') {
    return {
      readBlob: async () => codexBlob(request),
      readIdentity: async () => Promise.resolve(null),
    };
  }

  return {
    readBlob: async () => claudeBlob(request),
    readIdentity: async () => fileAt(join(request.homeFolder, '.claude.json')),
  };
}
