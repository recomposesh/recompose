import type { Account } from '@recompose/contracts';

import { subscriptionProductNameOf } from '@recompose/contracts';
import { useQuery } from '@tanstack/react-query';

import type { BrandMarkName } from '../../../../shared/ui';
import type { AccountQuota, QuotaGauge } from '../../lib/quota-gauges';

import { accountMark } from '../../../../entities/account';
import { accountsQueryOptions, quotaWindowsQueryOptions } from '../../../../shared/api';
import { useDisplayTick } from '../../../../shared/lib';
import { ProportionFill, VendorMark } from '../../../../shared/ui';
import { accountLabelOf } from '../../lib/account-labels';
import { quotaCardsOf } from '../../lib/quota-gauges';

const A_MINUTE = 60_000;

const RESET_ZONE = new Intl.DateTimeFormat().resolvedOptions().timeZone;

const SOURCE_SENTENCE = `The share each vendor reports for its own plan. A vendor that reports none falls back on this machine's own logs. Times in ${RESET_ZONE}.`;

/**
 * The rail under one window, which carries a fill only where a vendor named the limit it ends at.
 *
 * @summary A rail with no limit behind it reads as a percentage whatever it is told, so a burn
 * measured against nothing would put a busy day at the end of a full bar. The ticks are what say a
 * row was never measured: a solid rail is the one a vendor answered for, and the two must never
 * look alike on a page carrying both.
 */
function windowRule(gauge: QuotaGauge, accountIdentity: string) {
  if (gauge.share === undefined) {
    return <span aria-hidden className="block h-1.5 w-full rounded-full meter-track-ticks" />;
  }

  return <ProportionFill label={`${accountIdentity} ${gauge.lengthLabel}`} value={gauge.share} />;
}

function gaugeFooting(gauge: QuotaGauge) {
  if (gauge.countdown === undefined && gauge.standing === undefined) {
    return null;
  }

  return (
    <div className="flex items-baseline justify-between gap-2 text-caption text-ink-secondary">
      <span className="shrink-0">{gauge.countdown}</span>
      <span className="ms-auto truncate">{gauge.standing}</span>
    </div>
  );
}

/**
 * The vendor mark one card leads with, or nothing where the registry no longer holds the account.
 *
 * @summary The strip reads its accounts from the usage ledger, which outlives the registry, so a
 * card can stand for an account nobody holds any more. Such a card keeps its figures and loses only
 * its logo, rather than falling out of the strip.
 */
function markOf(
  accounts: { accounts: readonly Account[] } | undefined,
  accountId: string,
): BrandMarkName | undefined {
  const held = accounts?.accounts.find((account) => account.id === accountId);

  return held === undefined ? undefined : accountMark(held);
}

function gaugeRow(gauge: QuotaGauge, accountIdentity: string) {
  return (
    <div className="flex flex-col gap-1.5" key={gauge.length}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-detail text-ink">{gauge.lengthLabel}</span>
        <span className="shrink-0 text-detail font-medium text-ink tabular-nums">
          {gauge.headline}
        </span>
      </div>
      {windowRule(gauge, accountIdentity)}
      {gaugeFooting(gauge)}
    </div>
  );
}

const AWAITING_WINDOWS = ['5h', 'week'] as const;

/**
 * A plan waiting for its first request, drawn as the card it will become.
 *
 * @summary The rails stand under the notice rather than being replaced by it, so the card keeps the
 * height and the shape it holds once traffic lands and the strip never jumps as accounts wake up.
 * They carry no words of their own: a label faded behind a notice is a label nobody can read, and
 * an empty rail already says the window is waiting rather than spent.
 */
function awaitingCard() {
  return (
    <div className="relative flex flex-col gap-3">
      <div aria-hidden className="flex flex-col gap-3 opacity-40">
        {AWAITING_WINDOWS.map((length) => (
          <span className="flex h-8 items-end" key={length}>
            <span className="block h-1.5 w-full rounded-full meter-track-ticks" />
          </span>
        ))}
      </div>
      <p className="absolute inset-0 flex items-center justify-center">
        <span className="flex flex-col items-center gap-0.5 rounded-control bg-surface-card px-3 py-1 text-center">
          <span className="text-detail font-medium text-ink">No traffic yet</span>
          <span className="text-caption text-ink-secondary">
            Send a request through this plan and it fills here.
          </span>
        </span>
      </p>
    </div>
  );
}

function accountGauges(
  account: AccountQuota,
  accountName: string,
  mark: BrandMarkName | undefined,
) {
  const plan = subscriptionProductNameOf(account.provider);
  const accountIdentity = `${plan} · ${accountName}`;

  return (
    <li className="flex min-w-0 flex-col gap-2" key={account.accountId}>
      <div className="flex min-w-0 items-center gap-2">
        <VendorMark className="size-5 shrink-0" name={mark} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-card-title text-ink">{plan}</span>
          <span className="truncate text-detail text-ink-secondary">{accountName}</span>
        </span>
      </div>
      {account.gauges.length === 0 ? (
        awaitingCard()
      ) : (
        <div className="flex flex-col gap-3">
          {account.gauges.map((gauge) => gaugeRow(gauge, accountIdentity))}
        </div>
      )}
    </li>
  );
}

/**
 * How much of each subscription plan is spent, read from the vendor wherever the vendor says.
 *
 * @summary A vendor that reports a share of its own plan rides the answer this machine was already
 * making, so the figure costs nothing and stays as fresh as the traffic. A vendor that reports none
 * leaves the row measuring the burn against the account's own busiest earlier window instead, and
 * the caption names both derivations so no figure here can be mistaken for the other. An account
 * this machine has logged nothing for carries no window, and the whole strip stands down rather
 * than printing zeros it cannot vouch for. The cards sit on a grid rather than on a wrapping row,
 * because a wrapped card stretches to fill the line it lands on, and a fifth account would read as
 * four times the plan of the four above it. One address can sign into two plans at once, so a card
 * heads with the plan product and keeps the address beneath it, which tells two same-address cards
 * apart.
 */
export function QuotaStrip() {
  const windows = useQuery(quotaWindowsQueryOptions);
  const accounts = useQuery(accountsQueryOptions);
  const now = useDisplayTick(A_MINUTE);
  const folded = quotaCardsOf(accounts.data?.accounts ?? [], windows.data ?? [], now);

  if (folded.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Plan usage limits"
      className="flex flex-col gap-3 rounded-card border border-line-subtle bg-surface-card p-3.5"
    >
      <div className="flex flex-col gap-0.5">
        <h2 className="text-card-title text-ink">Plan usage limits</h2>
        <p className="text-caption text-ink-secondary">{SOURCE_SENTENCE}</p>
      </div>
      <ul className="plan-card-grid gap-x-6 gap-y-5">
        {folded.map((account) =>
          accountGauges(
            account,
            accountLabelOf(accounts.data, account.accountId),
            markOf(accounts.data, account.accountId),
          ),
        )}
      </ul>
    </section>
  );
}
