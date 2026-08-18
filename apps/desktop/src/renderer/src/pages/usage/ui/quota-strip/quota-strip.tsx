import { useQuery } from '@tanstack/react-query';

import type { AccountQuota, QuotaGauge } from '../../lib/quota-gauges';

import { accountsQueryOptions, quotaWindowsQueryOptions } from '../../../../shared/api';
import { useDisplayTick } from '../../../../shared/lib';
import { ProportionFill } from '../../../../shared/ui';
import { accountLabelOf } from '../../lib/account-labels';
import { quotaGaugesOf } from '../../lib/quota-gauges';

const A_MINUTE = 60_000;

const SOURCE_SENTENCE =
  "Token burn from this machine's own logs, on UTC hour boundaries. Not an official quota.";

function gaugeRow(gauge: QuotaGauge, accountName: string) {
  return (
    <div className="flex flex-col gap-1" key={gauge.length}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-detail text-ink">{gauge.lengthLabel}</span>
        <span className="font-mono text-mono-value text-ink tabular-nums">{gauge.burn}</span>
      </div>
      <ProportionFill
        label={`${accountName} ${gauge.lengthLabel} burn`}
        marker={gauge.marker}
        value={gauge.share}
      />
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-caption text-ink-secondary">{gauge.standing}</span>
        {gauge.countdown === undefined ? null : (
          <span className="text-caption text-ink-secondary">{gauge.countdown}</span>
        )}
      </div>
    </div>
  );
}

function accountGauges(account: AccountQuota, accountName: string) {
  return (
    <li className="flex min-w-56 flex-1 flex-col gap-2" key={account.accountId}>
      <span className="text-card-title text-ink">{accountName}</span>
      {account.gauges.map((gauge) => gaugeRow(gauge, accountName))}
    </li>
  );
}

/**
 * What each subscription account burned in its standing windows, and how that compares to its own.
 *
 * @summary No first-party quota endpoint exists, so the strip measures a burn against the account's
 * own busiest window rather than against a limit, and the caption names the derivation so no figure
 * here can be mistaken for an official remaining quota. An account this machine has logged nothing
 * for carries no window, and the whole strip stands down rather than printing zeros it cannot vouch
 * for.
 */
export function QuotaStrip() {
  const windows = useQuery(quotaWindowsQueryOptions);
  const accounts = useQuery(accountsQueryOptions);
  const now = useDisplayTick(A_MINUTE);
  const folded = quotaGaugesOf(windows.data ?? [], now);

  if (folded.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Quota windows"
      className="flex flex-col gap-3 rounded-card border border-line-subtle bg-surface-card p-3.5"
    >
      <div className="flex flex-col gap-0.5">
        <h2 className="text-card-title text-ink">Quota windows</h2>
        <p className="text-caption text-ink-secondary">{SOURCE_SENTENCE}</p>
      </div>
      <ul className="flex flex-wrap gap-6">
        {folded.map((account) =>
          accountGauges(account, accountLabelOf(accounts.data, account.accountId)),
        )}
      </ul>
    </section>
  );
}
