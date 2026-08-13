import { createHash } from 'node:crypto';

export type KeychainItem = { service: string; account: string };

const VENDOR_SERVICE = 'Claude Code-credentials';

const CODEX_SERVICE = 'Codex Auth';

const HOME_MARK_LENGTH = 8;

const CODEX_MARK_LENGTH = 16;

function markOf(home: string, length: number): string {
  return createHash('sha256').update(home).digest('hex').slice(0, length);
}

/**
 * @summary The item the person's own Claude Code reads, which the app never writes to and never
 * clears. It stands apart from every item a sign-in the app ran produced.
 */
export function machineVendorItem(osUser: string): KeychainItem {
  return { service: VENDOR_SERVICE, account: osUser };
}

/**
 * @summary Claude Code keeps one credential per config home and names its keychain item after
 * that home, so a sign-in the app ran lands here rather than in the person's own item.
 */
export function homeVendorItem(home: string, osUser: string): KeychainItem {
  return { service: `${VENDOR_SERVICE}-${markOf(home, HOME_MARK_LENGTH)}`, account: osUser };
}

/**
 * @summary Where Codex keeps its record on a machine whose keyring holds it rather than a file.
 * Codex names the entry after the config home rather than the person, from the first sixteen hex
 * characters of the SHA-256 of that home's resolved path (`codex-rs/login/src/auth/storage.rs`,
 * `compute_store_key`). The home arrives resolved, the way Codex canonicalizes it before hashing.
 */
export function codexVendorItem(resolvedHome: string): KeychainItem {
  return {
    service: CODEX_SERVICE,
    account: `cli|${markOf(resolvedHome, CODEX_MARK_LENGTH)}`,
  };
}
