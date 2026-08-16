import type { Account, AccountsDocument } from '@recompose/contracts';

import type { OptionGroup, OptionRow } from '../ui/option-list/option-list';

import {
  accountDetail,
  accountKindTitle,
  accountKinds,
  accountMark,
  accountProductName,
  accountsOfKind,
  accountsStandingAsTarget,
} from '../../../entities/account';

/**
 * One account as the picker offers it, read the way its card on the canvas reads.
 *
 * @summary The product leads and the identity stands under it, exactly as the target card names
 * the same account, so a row and the card it becomes are recognizably one thing. It has to be this
 * way round: two subscriptions signed in as one address are one string as far as the address goes,
 * and a picker that led with the address would offer two rows nobody could tell apart.
 */
function optionFor(account: Account): OptionRow {
  const mark = accountMark(account);

  return {
    id: account.id,
    name: accountProductName(account),
    detail: accountDetail(account),
    ...(mark === undefined ? {} : { mark }),
  };
}

/**
 * The accounts a target can name, gathered the way the picker offers them.
 *
 * @summary Every stored account stands under its own kind and the kinds keep the registry's own
 * order. A kind holding nothing offered stands as no group, because an empty heading says only
 * that a person has none.
 */
export function targetGroups(accounts: AccountsDocument['accounts']): readonly OptionGroup[] {
  const offered = accountsStandingAsTarget(accounts);
  const gathered: OptionGroup[] = [];

  for (const kind of accountKinds) {
    const options = accountsOfKind(offered, kind).map(optionFor);

    if (options.length > 0) {
      gathered.push({ heading: accountKindTitle(kind), options });
    }
  }

  return gathered;
}
