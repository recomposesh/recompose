import type { Account } from '@recompose/contracts';

import { localRuntimes } from '@recompose/contracts';

import type { BrandMarkName } from '../../../shared/ui';

import { brandMarkNames } from '../../../shared/ui';

/**
 * The name a stored account reads as wherever it stands for itself.
 *
 * @summary A credentialed account carries the name a person filed it under, and a runtime carries
 * none, because nobody names a server they only pointed at. The runtime reads as the server it is,
 * so a row and a picker never leave one nameless.
 */
export function accountName(account: Account): string {
  return account.kind === 'local' ? localRuntimes[account.provider].name : account.label;
}

/**
 * The vendor mark a stored account leads with, or nothing where recompose draws none for it.
 *
 * @summary The inventory is the one authority on what can be drawn, so the mark is looked up in it
 * rather than assumed from the provider a registry row was stored under, which is a free string.
 */
export function accountMark(account: Account): BrandMarkName | undefined {
  return brandMarkNames.find((drawn) => drawn === account.provider);
}

/**
 * The whole identity a target reads as: its kind, its provider, and its name.
 *
 * @summary A bare label tells a person nothing about where a binding routes, because two accounts
 * can share one email. The kind and the provider carry the difference, so the identity says all
 * three wherever a target stands for a routing decision.
 */
export function accountIdentity(account: Account): string {
  return `${account.kind} · ${account.provider} · ${accountName(account)}`;
}
