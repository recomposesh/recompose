import { useQuery } from '@tanstack/react-query';

import type { AccountFace } from '../../lib/account-labels';
import type { BalanceFace } from '../../lib/balance-faces';

import {
  accountsQueryOptions,
  balancesQueryOptions,
  useRefreshBalances,
  withRefusal,
} from '../../../../shared/api';
import { useDisplayTick } from '../../../../shared/lib';
import { Button, Icon, VendorMark } from '../../../../shared/ui';
import { accountFaceOf } from '../../lib/account-labels';
import { balanceFaceOf } from '../../lib/balance-faces';

const A_MINUTE = 60_000;

/**
 * One account's balance, headed the way its plan card is headed on the strip above.
 *
 * @summary The two strips name the same accounts, so a person who learned an account by its mark
 * and its product on one meets the same head on the other. The product leads and the name sits
 * under it, because a person may file several accounts under one address and the address alone
 * would leave the cards indistinguishable.
 */
function balanceCard(face: BalanceFace, who: AccountFace) {
  return (
    <li className="flex min-w-0 flex-col gap-2" key={face.accountId}>
      <div className="flex min-w-0 items-center gap-2">
        <VendorMark className="size-5 shrink-0" name={who.mark} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-card-title text-ink">{who.product ?? who.name}</span>
          <span className="truncate text-detail text-ink-secondary">{who.name}</span>
        </span>
      </div>
      <div className="flex flex-col items-start gap-0.5">
        <span className="font-mono text-mono-figure text-ink tabular-nums">{face.remaining}</span>
        {face.detail === undefined ? null : (
          <span className="text-caption text-ink-secondary">{face.detail}</span>
        )}
        {face.stamp === undefined ? null : (
          <span className="text-caption text-ink-secondary">{face.stamp}</span>
        )}
        {face.failure === undefined ? null : (
          <span className="text-caption text-danger-ink" role="alert">
            {face.failure}
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * Each aggregator account's credits, as a reading taken at a stamped moment.
 *
 * @summary A balance is a reading rather than a live counter, so the stamp beside it is the whole
 * point: the upstream itself caches for a minute and the desk holds the last good reading, which is
 * why a failed read keeps its figure and prints the failure instead of blanking. The refresh asks
 * every account at once, because the credits channel takes no account of its own.
 */
export function BalanceStrip() {
  const balances = useQuery(balancesQueryOptions);
  const accounts = useQuery(accountsQueryOptions);
  const refresh = withRefusal(useRefreshBalances());
  const now = useDisplayTick(A_MINUTE);
  const held = balances.data ?? [];

  if (held.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Credits"
      className="flex flex-col gap-3 rounded-card border border-line-subtle bg-surface-card p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-card-title text-ink">Credits</h2>
        <Button
          onPress={() => {
            refresh.mutate();
          }}
          variant="secondary"
        >
          <Icon aria-hidden className="size-3" name="renew" />
          Refresh credits
        </Button>
      </div>
      {refresh.refusal === undefined ? null : (
        <p className="text-detail text-danger-ink" role="alert">
          {refresh.refusal}
        </p>
      )}
      <ul className="plan-card-grid gap-x-6 gap-y-5">
        {held.map((balance) =>
          balanceCard(balanceFaceOf(balance, now), accountFaceOf(accounts.data, balance.accountId)),
        )}
      </ul>
    </section>
  );
}
