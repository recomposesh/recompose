import type { AccountKind } from '@recompose/contracts';

/** What an arrival is told apart by, and the product a mark is remembered against. */
export type ArrivedAccount = { id: string; provider: string; kind: AccountKind };

/**
 * The key a mark is remembered against, which is the product rather than the row.
 *
 * @summary A source recorded during setup arrives back under a stored account id, not the id the
 * machine row carried, so a mark kept by row would clear itself the moment the record landed.
 */
export function productOf(account: { provider: string; kind: AccountKind }): string {
  return `${account.provider}:${account.kind}`;
}

/**
 * The products a person connected while setup stood.
 *
 * @summary An account already on the machine when setup opened is one the sources step is
 * offering, so it waits for the person to pick it. One that lands afterwards is one they just
 * connected, and asking them to tick a row they only just filled in is asking twice.
 */
export function productsArrivedSince(
  known: ReadonlySet<string>,
  accounts: readonly ArrivedAccount[],
): readonly string[] {
  const arrived: string[] = [];

  for (const account of accounts) {
    if (!known.has(account.id)) {
      arrived.push(productOf(account));
    }
  }

  return arrived;
}
