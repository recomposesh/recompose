import type { SubscriptionAccount } from '@recompose/contracts';

import type { CredentialCustody, CustodyOutcome } from './credential-custody';
import type { SubscriptionHomes } from './subscription-homes';

import { custodyOver } from './credential-custody';

export type SubscriptionRelease = (
  row: SubscriptionAccount,
  survivors: readonly string[],
) => Promise<CustodyOutcome>;

/**
 * @summary Letting an account go hands nothing back, because the app took nothing. Its credential
 * sat under the keychain item its own config home owns, so removing that item disturbs neither the
 * person's own login nor any other account.
 */
export function subscriptionRelease(
  homes: SubscriptionHomes,
  custody: CredentialCustody | null,
): SubscriptionRelease {
  return async (row, survivors) => {
    const keeper = custodyOver(custody, row.provider);
    const letGo = await (keeper?.removeForHome(homes.homeFor(row.provider, row.id)) ??
      Promise.resolve<CustodyOutcome>({ ok: true }));

    await homes.removeHome(row.provider, row.id);
    await homes.healActive(row.provider, survivors);

    return letGo;
  };
}
