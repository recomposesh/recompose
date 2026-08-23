import type { Account } from '@recompose/contracts';

import type { BrandMarkName } from '../../../shared/ui';

import { accountMark, accountName, accountProductName } from '../../../entities/account';

type LabelledAccounts = { accounts: readonly { id: string }[] };

/**
 * The name a person knows one account by, falling back to the id a bucket kept.
 *
 * @summary A bucket stores the account id alone so a cost basis survives a rename, which leaves
 * every surface reading one to look the name up. A local runtime carries no name at all, and an
 * account deleted since it served still has rows, so the id has to stand as its own label rather
 * than leaving the reading blank.
 */
export function accountLabelOf(accounts: LabelledAccounts | undefined, accountId: string): string {
  const held = accounts?.accounts.find((account) => account.id === accountId);

  return held !== undefined && 'label' in held && typeof held.label === 'string'
    ? held.label
    : accountId;
}

export type AccountFace = {
  /** The name a person knows the account by, or the id its buckets kept. */
  name: string;
  /** The product serving it, absent where the registry no longer holds the account. */
  product: string | undefined;
  /** The vendor mark it leads with, absent where recompose draws none for it. */
  mark: BrandMarkName | undefined;
};

/**
 * One account as a card heads with it: the product, the name, and the vendor drawing.
 *
 * @summary Buckets and balances both key by account id alone so a cost basis survives a rename,
 * which leaves every card here looking the identity up. An account deleted since it served still
 * has rows, so the id stands as its own name and the card keeps its figures rather than blanking.
 */
export function accountFaceOf(
  accounts: { accounts: readonly Account[] } | undefined,
  accountId: string,
): AccountFace {
  const held = accounts?.accounts.find((account) => account.id === accountId);

  if (held === undefined) {
    return { name: accountId, product: undefined, mark: undefined };
  }

  return { name: accountName(held), product: accountProductName(held), mark: accountMark(held) };
}
