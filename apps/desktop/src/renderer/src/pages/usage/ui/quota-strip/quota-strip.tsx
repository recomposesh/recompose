import type { QuotaWindow } from '@recompose/contracts';

import { compactCount } from '../../../../shared/lib';
import { ProportionFill } from '../../../../shared/ui';

type QuotaStripProps = {
  /** The standing windows main derived, every length and account together. */
  windows: readonly QuotaWindow[];
  /** The display name an account id answers to. */
  accountNameOf: (accountId: string) => string;
  /** The instant the countdowns read against. */
  now: number;
};

const TRACK_HEADROOM = 1.15;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

const WINDOW_WORDING: Record<QuotaWindow['length'], string> = {
  '5h': '5-hour window',
  week: 'weekly window',
};

function recordDate(openedAt: number): string {
  return new Date(openedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function resetReading(closesAt: number, now: number): string {
  const left = Math.max(0, closesAt - now);
  const hours = Math.floor(left / HOUR_MS);
  const minutes = Math.round((left % HOUR_MS) / MINUTE_MS);

  if (hours === 0) {
    return `~${String(minutes)}m until reset`;
  }

  if (minutes === 0) {
    return `~${String(hours)}h until reset`;
  }

  return `~${String(hours)}h ${String(minutes)}m until reset`;
}

function burnLine(window: QuotaWindow): string {
  return `~${compactCount(window.burnTokens)} tokens this window`;
}

function recordLine(window: QuotaWindow): string {
  if (window.record === undefined || window.burnTokens >= window.record.burnTokens) {
    return 'the busiest on record';
  }

  return `record ~${compactCount(window.record.burnTokens)} on ${recordDate(window.record.openedAt)}`;
}

function countdownReading(window: QuotaWindow, now: number) {
  if (window.length !== '5h' || window.closesAt === undefined) {
    return null;
  }

  return <span>{resetReading(window.closesAt, now)}</span>;
}

function gaugeRow(window: QuotaWindow, name: string, now: number) {
  const recordBurn = window.record?.burnTokens ?? 0;
  const trackMax = Math.max(window.burnTokens, recordBurn, 1) * TRACK_HEADROOM;

  return (
    <div className="flex flex-col gap-1" key={`${window.accountId}:${window.length}`}>
      <div className="flex items-baseline justify-between gap-3 text-detail">
        <span className="text-ink">
          {name} · {WINDOW_WORDING[window.length]}
        </span>
        <span className="text-ink-secondary">{recordLine(window)}</span>
      </div>
      <ProportionFill
        label={`${name} ${WINDOW_WORDING[window.length]} burn`}
        marker={window.record === undefined ? undefined : recordBurn / trackMax}
        value={window.burnTokens / trackMax}
      />
      <div className="flex items-baseline justify-between gap-3 text-detail text-ink-secondary">
        <span className="font-mono text-mono-value tabular-nums">{burnLine(window)}</span>
        {countdownReading(window, now)}
      </div>
    </div>
  );
}

/**
 * Per-subscription burn gauges over the windows local logs can prove.
 *
 * @summary Every figure carries the approximation prefix and the strip names its derivation,
 * because nothing here is an official quota. The track never rescales to the current burn: the
 * record draws as a marker, and a record-breaking window says so rather than filling the bar.
 */
export function QuotaStrip({ windows, accountNameOf, now }: QuotaStripProps) {
  if (windows.length === 0) {
    return null;
  }

  return (
    <section aria-label="Quota" className="flex flex-col gap-3">
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {windows.map((window) => gaugeRow(window, accountNameOf(window.accountId), now))}
      </div>
      <p className="text-caption text-ink-secondary">
        Derived from local logs on UTC hour boundaries, never an official quota.
      </p>
    </section>
  );
}
