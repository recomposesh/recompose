import { storagePathsFor } from '../ipc/storage-context';
import { loadAccountsFile } from './accounts-store';
import { loadVaultFile, saveVaultFile } from './vault';
import { reconciledVault } from './vault-reconcile';

export type VaultMaintenance = {
  /** The refs swept, empty wherever nothing had been orphaned. */
  swept: readonly string[];
  /** The accounts whose credential is gone, left standing rather than removed. */
  dangling: readonly string[];
  /**
   * What a boot should say out loud, empty wherever the stores agreed.
   *
   * @summary The repair decides what is worth saying, rather than the boot that calls it. A store
   * quietly lightened is worse than one left diverged, so a sweep always leaves a sentence behind.
   */
  notes: readonly string[];
};

function notesFor(swept: readonly string[], dangling: readonly string[]): string[] {
  const notes: string[] = [];

  if (swept.length > 0) {
    notes.push(`swept ${String(swept.length)} vault entries no account reached`);
  }

  if (dangling.length > 0) {
    notes.push(`accounts whose credential is gone: ${dangling.join(', ')}`);
  }

  return notes;
}

/**
 * Repairs the divergence a failed write between two files can leave behind.
 *
 * @summary The vault and the account registry are separate files written one after the other, and
 * ADR-0018 took that bounded window deliberately. This runs once at boot, which is the only moment
 * nothing else is writing either file, and it is the repair that ADR deferred.
 *
 * It writes only when there is something to sweep, so an ordinary boot touches no file. A person
 * whose store is intact pays a read and nothing else.
 */
export async function reconcileVault(
  userDataPath: string,
  onCorrupt: (quarantinedPath: string) => void,
): Promise<VaultMaintenance> {
  const paths = storagePathsFor(userDataPath);
  const [opened, accounts] = await Promise.all([
    loadVaultFile(paths.vaultFile, onCorrupt),
    loadAccountsFile(paths.accountsFile, onCorrupt),
  ]);

  const settled = reconciledVault(opened, accounts);

  if (settled.swept.length > 0) {
    await saveVaultFile(paths.vaultFile, settled.vault);
  }

  return {
    swept: settled.swept,
    dangling: settled.dangling,
    notes: notesFor(settled.swept, settled.dangling),
  };
}
