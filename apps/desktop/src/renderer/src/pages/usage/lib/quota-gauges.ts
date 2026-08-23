import type { Account, QuotaWindow } from '@recompose/contracts';

import { compactCount } from '../../../shared/lib';

const A_HUNDRED = 100;

const LENGTH_LABELS = {
  '5h': 'Current session',
  week: 'Current week',
} as const satisfies Record<QuotaWindow['length'], string>;

const recordDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

const weekdayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

const clockFace = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export type QuotaGauge = {
  /** The window length the gauge stands for. */
  length: QuotaWindow['length'];
  /** The length as a person reads it. */
  lengthLabel: string;
  /** What the row leads with: the vendor's own share where it read one, the burn otherwise. */
  headline: string;
  /** How far along the track the reading stands, absent while no vendor named a limit. */
  share: number | undefined;
  /** The quiet detail beside the reset, absent where the window has none worth printing. */
  standing: string | undefined;
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

function clockWording(at: number): string {
  return clockFace.format(at).replace(/\s+(?=[AP]M)/u, ' ');
}

/**
 * When a window turns over, named the way a person reads a clock.
 *
 * @summary An hour alone reads as today, so a turnover on any other day names that day beside it.
 * A person compares an hour against their own clock at a glance, which a span in hours and minutes
 * makes them do arithmetic for.
 */
function turnoverWording(at: number, now: number, mark: string): string {
  const face = `${mark}${clockWording(at)}`;

  if (new Date(at).toDateString() === new Date(now).toDateString()) {
    return `Resets at ${face}`;
  }

  return `Resets ${weekdayName.format(at)} at ${face}`;
}

/**
 * The share of a plan a vendor says is spent, as the vendor's own client prints it.
 *
 * @summary Whole percent and the word used, because that is what a person reading the same plan in
 * the vendor's own client sees, and two surfaces disagreeing over a decimal place about one figure
 * would read as two different figures.
 */
function percentage(share: number): string {
  return `${String(Math.round(share * A_HUNDRED))}% used`;
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

/**
 * What the earlier windows say about this one, or nothing where none of them says anything.
 *
 * @summary A window with no earlier one to compare against prints no line at all. Saying that no
 * window stands on record fills a row with the absence of a fact, and every weekly window on a
 * fresh machine would carry that same empty sentence.
 */
function standingWording(burnTokens: number, record: QuotaWindow['record']): string | undefined {
  const standing = recordWorthMeasuring(record);

  if (standing === undefined) {
    return undefined;
  }

  if (burnTokens >= standing.burnTokens) {
    return 'Busiest window on record';
  }

  return `Record ${compactCount(standing.burnTokens)} on ${recordDay.format(standing.openedAt)}`;
}

type VendorReading = NonNullable<QuotaWindow['reported']>;

type Reading = Pick<QuotaGauge, 'countdown' | 'headline' | 'share' | 'standing'>;

/**
 * The row a vendor measured for itself, which is the only one here that draws a track.
 *
 * @summary The track ends where the plan ends, because the vendor named both figures a share needs.
 * The burn stays underneath, named as this machine's own, since the two counts answer different
 * questions: a person reading a plan at 90% still needs to know how much of that this machine sent.
 */
function vendorReading(window: QuotaWindow, reported: VendorReading, now: number): Reading {
  return {
    headline: percentage(reported.spentShare),
    share: reported.spentShare,
    standing: `${compactCount(window.burnTokens)} through this machine`,
    countdown:
      reported.resetsAt === undefined ? undefined : turnoverWording(reported.resetsAt, now, ''),
  };
}

/**
 * The reading this machine's own logs prove, which measures no plan and so draws no track.
 *
 * @summary A track needs two figures and only the vendor holds the second one. Drawing the burn
 * against the account's own busiest window put a person having a busy day at the end of a full bar,
 * which reads as a plan spent rather than as a record passed. So the record stays a sentence and the
 * row leads with the count. The count says sent rather than standing as a bare figure, because two
 * cards side by side can head with a share of a plan and a count of tokens, and a reader has to be
 * able to tell those apart without reading the caption above them.
 */
function localReading(window: QuotaWindow, now: number): Reading {
  return {
    headline: `${compactCount(window.burnTokens)} sent`,
    share: undefined,
    standing: standingWording(window.burnTokens, window.record),
    countdown:
      window.closesAt === undefined ? undefined : turnoverWording(window.closesAt, now, '~'),
  };
}

function readingOf(window: QuotaWindow, now: number): Reading {
  return window.reported === undefined
    ? localReading(window, now)
    : vendorReading(window, window.reported, now);
}

function gaugeOf(window: QuotaWindow, now: number): QuotaGauge {
  return {
    length: window.length,
    lengthLabel: LENGTH_LABELS[window.length],
    ...readingOf(window, now),
  };
}

/**
 * Every subscription account's standing windows, folded into a card apiece.
 *
 * @summary Two readings can stand behind one row and they must never be confused. Where the vendor
 * answered with a share of the plan, the row prints that share and counts down to the reset the
 * vendor named. Where no vendor reports one, the row falls back on this machine's own logs, measures
 * the burn against the account's own busiest earlier window, and wears the approximation prefix,
 * because that anchor was inferred from a quiet stretch rather than read from anybody.
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

/**
 * A card for every plan a person signed into, served or not.
 *
 * @summary The ledger only knows the accounts this machine has actually sent through, so a plan
 * signed in this morning would otherwise be missing from the very page a person opened to check it.
 * A card with no gauges is that plan waiting for its first request rather than a plan at zero. A
 * plan the registry no longer holds keeps its card, because its burn is still on record and a
 * figure that vanished with the account would read as traffic that never happened.
 */
export function quotaCardsOf(
  accounts: readonly Account[],
  windows: readonly QuotaWindow[],
  now: number,
): readonly AccountQuota[] {
  const folded = new Map(quotaGaugesOf(windows, now).map((card) => [card.accountId, card]));
  const signedIn = accounts.flatMap((account) =>
    account.kind === 'subscription'
      ? [
          folded.get(account.id) ?? {
            accountId: account.id,
            provider: account.provider,
            gauges: [],
          },
        ]
      : [],
  );
  const known = new Set(signedIn.map((card) => card.accountId));

  return [...signedIn, ...[...folded.values()].filter((card) => !known.has(card.accountId))];
}
