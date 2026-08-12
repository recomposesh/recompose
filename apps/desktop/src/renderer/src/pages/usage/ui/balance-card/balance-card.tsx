import type { AccountBalance } from '@recompose/contracts';

import { Button } from '../../../../shared/ui';

type BalanceCardProps = {
  /** The last answer per aggregator account, reading or failure or both. */
  balances: readonly AccountBalance[];
  /** The display name an account id answers to. */
  accountNameOf: (accountId: string) => string;
  /** The instant the staleness stamps read against. */
  now: number;
  /** Asks the desk for a fresh read. */
  onRefresh: () => void;
};

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function agoReading(readAt: number, now: number): string {
  const passed = Math.max(0, now - readAt);

  if (passed < MINUTE_MS) {
    return 'read just now';
  }

  if (passed < HOUR_MS) {
    return `read ~${String(Math.round(passed / MINUTE_MS))}m ago`;
  }

  return `read ~${String(Math.round(passed / HOUR_MS))}h ago`;
}

function balanceRow(balance: AccountBalance, name: string, now: number) {
  const reading = balance.reading;

  return (
    <div className="flex flex-col gap-0.5" key={balance.accountId}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-detail text-ink">{name}</span>
        {reading === undefined ? null : (
          <span className="text-caption text-ink-secondary">{agoReading(reading.readAt, now)}</span>
        )}
      </div>
      {reading === undefined ? null : (
        <span className="font-mono text-invitation text-ink tabular-nums">
          {dollars.format(reading.totalCredits - reading.totalUsage)}
        </span>
      )}
      {balance.failure === undefined ? null : (
        <span className="text-detail text-danger-ink">{balance.failure}</span>
      )}
    </div>
  );
}

/**
 * OpenRouter credits as a stamped reading, never a live counter.
 *
 * @summary The read-at stamp is data: a failed refresh keeps the last balance standing beside the
 * failure sentence, so a stale number never poses as a fresh one.
 */
export function BalanceCard({ balances, accountNameOf, now, onRefresh }: BalanceCardProps) {
  if (balances.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Credits"
      className="flex flex-col gap-3 rounded-card border border-line-subtle bg-surface-card p-4"
    >
      {balances.map((balance) => balanceRow(balance, accountNameOf(balance.accountId), now))}
      <div>
        <Button onPress={onRefresh} variant="secondary">
          Refresh credits
        </Button>
      </div>
    </section>
  );
}
