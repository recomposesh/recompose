import type { CustodyOutcome, KeychainItem, KeychainSeam } from './credential-custody';

import { KeychainDenied } from './credential-custody';
import { homeVendorItem, machineVendorItem } from './vendor-item';

/**
 * @summary The names an older build used, kept only so this repair can find what it left behind.
 * Nothing else addresses them, because no account squats on a shared item any longer.
 */
export const PARKED_SERVICE = 'recompose-parked-credentials';
export const RESERVED_SLOT = 'login-before-recompose';

export type CustodyRepairDeps = {
  keychain: KeychainSeam;
  osUser: string;
  homeFor: (accountId: string) => string;
  accountIds: () => Promise<readonly string[]>;
  activeId: () => Promise<string | null>;
};

const parkedItem = (slot: string): KeychainItem => ({ service: PARKED_SERVICE, account: slot });

async function carryInto(
  keychain: KeychainSeam,
  from: KeychainItem,
  to: KeychainItem,
): Promise<void> {
  const held = await keychain.read(from);

  if (held === null) {
    return;
  }

  if ((await keychain.read(to)) === null) {
    await keychain.write(to, held);
  }

  await keychain.remove(from);
}

/**
 * @summary The active account's credential sat in the item the person's own install reads, because
 * an older build put it there. It belongs to that account's own home, and what the build parked on
 * its way in belongs back. Where nothing was parked the shared item is emptied rather than left
 * holding this app's chain, which would leave two owners rotating one credential.
 *
 * A populated home item is the tell that this install already carried. From then on the shared
 * item holds the person's own login again, so touching it would take the very thing just returned.
 */
async function returnTheSharedItem(deps: CustodyRepairDeps, active: string | null): Promise<void> {
  if (active === null) {
    return;
  }

  const mine = homeVendorItem(deps.homeFor(active), deps.osUser);

  if ((await deps.keychain.read(mine)) !== null) {
    return;
  }

  const shared = machineVendorItem(deps.osUser);
  const standing = await deps.keychain.read(shared);

  if (standing === null) {
    return;
  }

  await deps.keychain.write(mine, standing);

  const parked = await deps.keychain.read(parkedItem(RESERVED_SLOT));

  await (parked === null ? deps.keychain.remove(shared) : deps.keychain.write(shared, parked));
}

/**
 * Carries an install written before each config home owned its own keychain item.
 *
 * @summary It runs on first custody use rather than at launch, because a launch-time keychain read
 * on a locked keychain would raise a prompt nobody caused. Every step writes its destination before
 * removing its source, so no ordering loses a credential, and a second run finds the destinations
 * populated and does nothing.
 */
export async function repairCustody(deps: CustodyRepairDeps): Promise<CustodyOutcome> {
  try {
    await returnTheSharedItem(deps, await deps.activeId());

    const ids = await deps.accountIds();

    await Promise.all(
      ids.map(async (id) =>
        carryInto(deps.keychain, parkedItem(id), homeVendorItem(deps.homeFor(id), deps.osUser)),
      ),
    );

    if ((await deps.keychain.read(parkedItem(RESERVED_SLOT))) !== null) {
      await deps.keychain.remove(parkedItem(RESERVED_SLOT));
    }

    return { ok: true };
  } catch (cause) {
    const why = cause instanceof Error ? cause.message : String(cause);

    return {
      ok: false,
      code: cause instanceof KeychainDenied ? 'keychain-denied' : 'storage-failed',
      message: `custody could not carry this install onto per-home keychain items: ${why}`,
    };
  }
}

/**
 * Wraps a keychain so an older install carries onto per-home items before anything reads one.
 *
 * @summary The repair runs on the first custody operation rather than at launch, because a
 * launch-time keychain read on a locked keychain would raise a prompt nobody caused. The first
 * custody read already happens on a surface a person opened. It runs once per process, and a
 * refusal is swallowed here rather than failing the read that triggered it, because the read has
 * its own answer to give and the repair retries on the next launch.
 */
export function keychainCarriedOnce(
  seam: KeychainSeam,
  carry: () => Promise<CustodyOutcome>,
): KeychainSeam {
  let carried: Promise<unknown> | null = null;
  const once = async (): Promise<void> => {
    carried ??= carry().catch(() => undefined);

    await carried;
  };

  return {
    read: async (item) => {
      await once();

      return seam.read(item);
    },
    write: async (item, blob) => {
      await once();

      return seam.write(item, blob);
    },
    remove: async (item) => {
      await once();

      return seam.remove(item);
    },
  };
}
