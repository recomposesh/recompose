import type { UsageRange, UsageReportAsk } from '@recompose/contracts';

import { usageSearchRangeSchema } from '@recompose/contracts';

import type { PresetRange, UsageSearch, UsageSearchRange } from './usage-search';

import { startOfMonth } from './calendar-grid';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export type UsageWindow = { from: number; to: number };

function reachingBack(width: number) {
  return (now: number): UsageWindow => ({ from: now - width, to: now });
}

function startOfWeek(at: number): number {
  const midnight = new Date(at);

  midnight.setHours(0, 0, 0, 0);
  midnight.setDate(midnight.getDate() - midnight.getDay());

  return midnight.getTime();
}

const RANGE_WINDOW: Record<PresetRange, (now: number) => UsageWindow> = {
  '1h': reachingBack(HOUR_MS),
  '24h': reachingBack(DAY_MS),
  '7d': reachingBack(7 * DAY_MS),
  '30d': reachingBack(30 * DAY_MS),
  'this-week': (now) => ({ from: startOfWeek(now), to: now }),
  'this-month': (now) => ({ from: startOfMonth(now), to: now }),
};

const RANGE_WORDING: Record<PresetRange, string> = {
  '1h': 'Last hour',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  'this-week': 'This week',
  'this-month': 'This month',
};

const PREVIOUS_WORD: Record<UsageSearchRange, string> = {
  '1h': '1h',
  '24h': '24h',
  '7d': '7d',
  '30d': '30d',
  'this-week': 'window',
  'this-month': 'window',
  custom: 'window',
};

export type PresetWindow = { range: PresetRange; label: string };

/** The windows the range popover offers, in the contract's own listing order. */
export const presetWindows: readonly PresetWindow[] = usageSearchRangeSchema.options
  .filter((range): range is PresetRange => range !== 'custom')
  .map((range) => ({ range, label: RANGE_WORDING[range] }));

/**
 * The window one view stands over, which a custom range names outright.
 *
 * @summary A range either reaches back a fixed width from now or opens at the boundary of the week
 * or month standing, and both keep closing at now. Only a drawn window carries its own edges.
 */
export function windowFor(search: UsageSearch, now: number): UsageWindow {
  if (search.range === 'custom') {
    return search.from !== undefined && search.to !== undefined
      ? { from: search.from, to: search.to }
      : RANGE_WINDOW['24h'](now);
  }

  return RANGE_WINDOW[search.range](now);
}

/** What a tile calls the window before this one: a fixed reach names itself, the rest is a window. */
export function previousWindowWord(range: UsageSearchRange): string {
  return PREVIOUS_WORD[range];
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
