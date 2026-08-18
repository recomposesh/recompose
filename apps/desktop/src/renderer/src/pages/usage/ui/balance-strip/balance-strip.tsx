import { useQuery } from '@tanstack/react-query';

import type { BalanceFace } from '../../lib/balance-faces';

import {
  accountsQueryOptions,
  balancesQueryOptions,
  useRefreshBalances,
  withRefusal,
} from '../../../../shared/api';
import { useDisplayTick } from '../../../../shared/lib';
import { Button, Icon } from '../../../../shared/ui';
import { accountLabelOf } from '../../lib/account-labels';
import { balanceFaceOf } from '../../lib/balance-faces';

const A_MINUTE = 60_000;

function balanceCard(face: BalanceFace, accountName: string) {
  return (
    <li className="flex min-w-40 flex-1 flex-col items-start gap-1" key={face.accountId}>
      <span className="text-caption text-ink-secondary">{accountName}</span>
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
      <ul className="flex flex-wrap gap-6">
        {held.map((balance) =>
          balanceCard(
            balanceFaceOf(balance, now),
            accountLabelOf(accounts.data, balance.accountId),
          ),
        )}
      </ul>
    </section>
  );
}
