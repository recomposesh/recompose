import type { SubscriptionProviderId } from '@recompose/contracts';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CredentialCustody } from './credential-custody';
import type { MachineStore } from './machine-credential';

export type MachineStoreRequest = {
  provider: SubscriptionProviderId;
  homeFolder: string;
  platform: NodeJS.Platform;
  custody: CredentialCustody | null;
};

async function fileAt(path: string): Promise<string | null> {
  return readFile(path, 'utf8').then(
    (found) => found,
    () => null,
  );
}

/**
 * @summary Where each provider's own tool keeps what it wrote, which is never inside a home this
 * app made. Claude Code keeps its credential in the login keychain on macOS and in its config home
 * elsewhere, while the address and the plan sit in a plain file either way.
 */
export function machineStoreFor(request: MachineStoreRequest): MachineStore {
  if (request.provider === 'openai') {
    return {
      readBlob: async () => fileAt(join(request.homeFolder, '.codex', 'auth.json')),
      readIdentity: async () => Promise.resolve(null),
    };
  }

  const keychainHolds = request.platform === 'darwin' && request.custody !== null;

  return {
    readBlob: async () =>
      keychainHolds && request.custody !== null
        ? request.custody.readMachineItem()
        : fileAt(join(request.homeFolder, '.claude', '.credentials.json')),
    readIdentity: async () => fileAt(join(request.homeFolder, '.claude.json')),
  };
}
