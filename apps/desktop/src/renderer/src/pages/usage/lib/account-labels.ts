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
