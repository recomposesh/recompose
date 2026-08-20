import type { QuotaWindow } from '@recompose/contracts';

import { compactCount } from '../../../shared/lib';

/**
 * Where the record sits on every quota track, as a share of the track's whole width.
 *
 * @summary The record is the largest of every window folded, the open one included, so a burn can
 * never pass it. Seating the record short of the end is what keeps a matched window reading as
 * matched rather than as a full bar, which would claim an exhaustion no local reading can know.
 */
const RECORD_STANDS_AT = 0.8;

const MS_IN_MINUTE = 60_000;

const MINUTES_IN_HOUR = 60;

const LENGTH_LABELS = {
  '5h': '5-hour window',
  week: 'Weekly window',
} as const satisfies Record<QuotaWindow['length'], string>;

const recordDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

export type QuotaGauge = {
  /** The window length the gauge stands for. */
  length: QuotaWindow['length'];
  /** The length as a person reads it. */
  lengthLabel: string;
  /** The burn this window carries, already printed. */
  burn: string;
  /** How far along the fixed track the burn stands, from zero to one. */
  share: number;
  /** Where the record sits on the same track, absent while nothing stands on record. */
  marker: number | undefined;
  /** What the record says: its figure and day, that this window matched it, or that none stands. */
  standing: string;
  /** How long until the window closes, absent for a length that closes on no honest boundary. */
  countdown: string | undefined;
};

export type AccountQuota = {
  /** The account every gauge under it belongs to. */
  accountId: string;
  /** The provider the account's windows named, so the card can say whose plan burns. */
  provider: string;
  /** The account's windows, in the order they arrived. */
  gauges: readonly QuotaGauge[];
};

function countdownWording(remainingMs: number): string {
  const minutes = Math.ceil(remainingMs / MS_IN_MINUTE);
  const hours = Math.floor(minutes / MINUTES_IN_HOUR);
  const rest = minutes % MINUTES_IN_HOUR;

  if (hours === 0) {
    return `Closes in ≈${String(rest)}m`;
  }

  if (rest === 0) {
    return `Closes in ≈${String(hours)}h`;
  }

  return `Closes in ≈${String(hours)}h ${String(rest)}m`;
}

/**
 * The record a gauge can actually measure against.
 *
 * @summary A record of nothing is no record: an account whose every window burned zero would
 * otherwise divide by it, and reading it as a window the current one matched would congratulate a
 * person on having sent nothing.
 */
function recordWorthMeasuring(record: QuotaWindow['record']): QuotaWindow['record'] {
  return record === undefined || record.burnTokens === 0 ? undefined : record;
}

function measuredAgainstRecord(
  burnTokens: number,
  record: QuotaWindow['record'],
): Pick<QuotaGauge, 'marker' | 'share'> {
  const standing = recordWorthMeasuring(record);

  if (standing === undefined) {
    return { share: 0, marker: undefined };
  }

  return {
    share: (burnTokens / standing.burnTokens) * RECORD_STANDS_AT,
    marker: RECORD_STANDS_AT,
  };
}

function standingWording(burnTokens: number, record: QuotaWindow['record']): string {
  const standing = recordWorthMeasuring(record);

  if (standing === undefined) {
    return 'No window on record yet';
  }

  if (burnTokens >= standing.burnTokens) {
    return 'Busiest window on record';
  }

  return `Record ${compactCount(standing.burnTokens)} on ${recordDay.format(standing.openedAt)}`;
}

function gaugeOf(window: QuotaWindow, now: number): QuotaGauge {
  return {
    length: window.length,
    lengthLabel: LENGTH_LABELS[window.length],
    burn: compactCount(window.burnTokens),
    ...measuredAgainstRecord(window.burnTokens, window.record),
    standing: standingWording(window.burnTokens, window.record),
    countdown: window.closesAt === undefined ? undefined : countdownWording(window.closesAt - now),
  };
}

/**
 * The windows one machine's own logs prove, folded into a card per account.
 *
 * @summary Nothing here claims an official remaining quota, because no first-party endpoint
 * answers one: a gauge measures a burn against the account's own busiest window, and the countdown
 * carries the approximation prefix because the anchor was inferred from a quiet stretch rather than
 * read from the vendor.
 */
export function quotaGaugesOf(
  windows: readonly QuotaWindow[],
  now: number,
): readonly AccountQuota[] {
  const folded = new Map<string, { provider: string; gauges: QuotaGauge[] }>();

  for (const window of windows) {
    const held = folded.get(window.accountId) ?? { provider: window.provider, gauges: [] };

    held.gauges.push(gaugeOf(window, now));
    folded.set(window.accountId, held);
  }

  return [...folded].map(([accountId, { provider, gauges }]) => ({ accountId, provider, gauges }));
}
