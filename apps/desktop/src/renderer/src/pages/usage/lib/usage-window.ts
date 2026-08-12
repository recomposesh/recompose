import type { UsageRange, UsageReportAsk } from '@recompose/contracts';

import type { UsageSearch, UsageSearchRange } from './usage-search';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const PRESET_REACH: Record<Exclude<UsageSearchRange, 'custom'>, number> = {
  '1h': HOUR_MS,
  '24h': DAY_MS,
  '7d': 7 * DAY_MS,
  '30d': 30 * DAY_MS,
};

const RANGE_WORDING: Record<Exclude<UsageSearchRange, 'custom'>, string> = {
  '1h': 'Last hour',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

export type UsageWindow = { from: number; to: number };

export type PresetKey =
  | 'last-hour'
  | 'last-24-hours'
  | 'last-7-days'
  | 'last-30-days'
  | 'this-week'
  | 'this-month';

export type PresetWindow = { key: PresetKey; label: string };

/** The windows the range popover offers, in the order it lists them. */
export const presetWindows: readonly PresetWindow[] = [
  { key: 'last-hour', label: 'Last hour' },
  { key: 'last-24-hours', label: 'Last 24 hours' },
  { key: 'last-7-days', label: 'Last 7 days' },
  { key: 'last-30-days', label: 'Last 30 days' },
  { key: 'this-week', label: 'This week' },
  { key: 'this-month', label: 'This month' },
];

/** The window one view stands over, which a custom range names outright. */
export function windowFor(search: UsageSearch, now: number): UsageWindow {
  if (search.range === 'custom' && search.from !== undefined && search.to !== undefined) {
    return { from: search.from, to: search.to };
  }

  const reach = search.range === 'custom' ? DAY_MS : PRESET_REACH[search.range];

  return { from: now - reach, to: now };
}

/** The window standing before the one on screen, the same width, ending where it opens. */
export function previousWindowFor(search: UsageSearch, now: number): UsageWindow {
  const { from, to } = windowFor(search, now);

  return { from: from - (to - from), to: from };
}

function coveringRange(reachBack: number): UsageRange {
  if (reachBack <= DAY_MS) {
    return '24h';
  }

  return reachBack <= 7 * DAY_MS ? '7d' : '30d';
}

/**
 * What one view asks main for, or nothing where it folds the renderer's own rows.
 *
 * @summary The live hour never reads the ledger. Every other window asks the narrowest range that
 * reaches back over the window and the one before it, because the tiles compare the two. A window
 * spanning two days or less asks for hours rather than accepting the folded days the range would
 * otherwise answer with, and the reader's day boundary rides along, so a folded day breaks at the
 * reader's midnight.
 */
export function reportAskFor(
  search: UsageSearch,
  now: number,
  dayOffsetMinutes: number,
): UsageReportAsk | undefined {
  if (search.range === '1h') {
    return undefined;
  }

  const window = windowFor(search, now);
  const range = coveringRange(now - previousWindowFor(search, now).from);
  const wantsHours = window.to - window.from <= 2 * DAY_MS && range === '7d';

  return {
    range,
    ...(wantsHours ? { bucketWidth: 'hour' as const } : {}),
    dayOffsetMinutes,
  };
}

function localMidnight(at: number): number {
  const day = new Date(at);

  day.setHours(0, 0, 0, 0);

  return day.getTime();
}

function weekStart(at: number): number {
  const midnight = new Date(localMidnight(at));

  midnight.setDate(midnight.getDate() - midnight.getDay());

  return midnight.getTime();
}

function monthStart(at: number): number {
  const midnight = new Date(localMidnight(at));

  midnight.setDate(1);

  return midnight.getTime();
}

const PRESET_RANGE: Partial<Record<PresetKey, UsageSearchRange>> = {
  'last-hour': '1h',
  'last-24-hours': '24h',
  'last-7-days': '7d',
  'last-30-days': '30d',
};

/**
 * The view one preset moves to, filters and chart left standing.
 *
 * @summary A calendar preset lands as a custom window over the local week or month, because a
 * window anchored to a boundary is not the same as one reaching back a fixed width.
 */
export function searchForPreset(search: UsageSearch, key: PresetKey, now: number): UsageSearch {
  const range = PRESET_RANGE[key];

  if (range !== undefined) {
    const { from: _from, to: _to, ...kept } = search;

    return { ...kept, range };
  }

  return {
    ...search,
    range: 'custom',
    from: key === 'this-week' ? weekStart(now) : monthStart(now),
    to: now,
  };
}

const dayAndTime = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** The window as the header prints it: a preset's own words, or both edges of a custom one. */
export function windowWording(search: UsageSearch, now: number): string {
  if (search.range !== 'custom') {
    return RANGE_WORDING[search.range];
  }

  const { from, to } = windowFor(search, now);

  return `${dayAndTime.format(from)} – ${dayAndTime.format(to)}`;
}
