import { createHash } from 'node:crypto';

import type { KeychainItem } from './credential-custody';

import { VENDOR_SERVICE } from './credential-custody';

const HOME_MARK_LENGTH = 8;

function markOf(home: string): string {
  return createHash('sha256').update(home).digest('hex').slice(0, HOME_MARK_LENGTH);
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
  return { service: `${VENDOR_SERVICE}-${markOf(home)}`, account: osUser };
}
