import type { SubscriptionProviderId } from '@recompose/contracts';

import type { KeychainItem } from './vendor-item';

import { oneAtATime } from '../storage/one-at-a-time';
import { homeVendorItem, machineVendorItem } from './vendor-item';

export type { KeychainItem } from './vendor-item';

export type KeychainSeam = {
  read: (item: KeychainItem) => Promise<string | null>;
  write: (item: KeychainItem, blob: string) => Promise<void>;
  remove: (item: KeychainItem) => Promise<void>;
};

export class KeychainDenied extends Error {}

export type CustodyOutcome =
  | { ok: true }
  | { ok: false; code: 'keychain-denied' | 'storage-failed'; message: string };

export type CredentialCustody = {
  readForHome: (home: string) => Promise<string | null>;
  writeForHome: (home: string, blob: string) => Promise<void>;
  removeForHome: (home: string) => Promise<CustodyOutcome>;
  moveBetweenHomes: (from: string, to: string) => Promise<CustodyOutcome>;
  readMachineItem: () => Promise<string | null>;
  reclaimMachineWrite: (home: string, restore: string | null) => Promise<CustodyOutcome>;
};

export function custodyOver(
  custody: CredentialCustody | null,
  provider: SubscriptionProviderId,
): CredentialCustody | null {
  return provider === 'anthropic' ? custody : null;
}

function refusal(step: string, subject: string, cause: unknown): CustodyOutcome {
  const why = cause instanceof Error ? cause.message : String(cause);

  return {
    ok: false,
    code: cause instanceof KeychainDenied ? 'keychain-denied' : 'storage-failed',
    message: `custody could not ${step} the subscription credential for ${subject}: ${why}`,
  };
}

async function attempt(
  step: string,
  subject: string,
  work: () => Promise<void>,
): Promise<CustodyOutcome> {
  try {
    await work();

    return { ok: true };
  } catch (cause) {
    return refusal(step, subject, cause);
  }
}

/**
 * @summary Claude Code keeps one credential per config home, so every account the app signs in
 * owns its own keychain item and no account ever squats on another's. The item the person's own
 * install reads is never among them, which is why nothing here parks or restores anything.
 */
export function credentialCustody(keychain: KeychainSeam, osUser: string): CredentialCustody {
  const lane = oneAtATime();
  const itemFor = (home: string): KeychainItem => homeVendorItem(home, osUser);

  const moveFrom = async (from: string, to: string): Promise<void> => {
    const held = await keychain.read(itemFor(from));

    if (held === null) {
      return;
    }

    await keychain.write(itemFor(to), held);
    await keychain.remove(itemFor(from));
  };

  const machineItem = machineVendorItem(osUser);

  const reclaimFromMachine = async (home: string, restore: string | null): Promise<void> => {
    const written = await keychain.read(machineItem);

    if (written === null) {
      return;
    }

    await keychain.write(itemFor(home), written);

    if (restore === null) {
      await keychain.remove(machineItem);

      return;
    }

    await keychain.write(machineItem, restore);
  };

  return {
    readForHome: async (home) => lane(async () => keychain.read(itemFor(home))),

    writeForHome: async (home, blob) => lane(async () => keychain.write(itemFor(home), blob)),

    removeForHome: async (home) =>
      lane(async () => attempt('let go of', home, async () => keychain.remove(itemFor(home)))),

    moveBetweenHomes: async (from, to) =>
      lane(async () => attempt('move', to, async () => moveFrom(from, to))),

    readMachineItem: async () => lane(async () => keychain.read(machineItem)),

    reclaimMachineWrite: async (home, restore) =>
      lane(async () => attempt('reclaim', home, async () => reclaimFromMachine(home, restore))),
  };
}
