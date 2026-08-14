import { describe, expect, it } from 'vitest';

import type { UsageSearch } from './usage-search';

import {
  presetWindows,
  previousWindowFor,
  previousWindowWord,
  reportAskFor,
  windowFor,
  windowWording,
} from './usage-window';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const NOW = 1_754_600_400_000;

const MIDWEEK = new Date(2026, 7, 12, 13, 45, 30, 250).getTime();

function viewing(over: Partial<UsageSearch> = {}): UsageSearch {
  return { range: '24h', metric: 'requests', stackedBy: 'gateway', ...over };
}

describe('the window a view stands over', () => {
  it('reaches back the preset own width from now', () => {
    expect(windowFor(viewing({ range: '1h' }), NOW)).toEqual({ from: NOW - HOUR, to: NOW });
    expect(windowFor(viewing({ range: '24h' }), NOW)).toEqual({ from: NOW - DAY, to: NOW });
    expect(windowFor(viewing({ range: '7d' }), NOW)).toEqual({ from: NOW - 7 * DAY, to: NOW });
    expect(windowFor(viewing({ range: '30d' }), NOW)).toEqual({ from: NOW - 30 * DAY, to: NOW });
  });

  it('stands on both edges a custom window names', () => {
    const custom = viewing({ range: 'custom', from: NOW - 5 * HOUR, to: NOW - HOUR });

    expect(windowFor(custom, NOW)).toEqual({ from: NOW - 5 * HOUR, to: NOW - HOUR });
  });

  it('falls back to the last day for a custom range standing on no edges at all', () => {
    expect(windowFor(viewing({ range: 'custom' }), NOW)).toEqual({ from: NOW - DAY, to: NOW });
  });

  it('falls back to the last day for a custom range naming one edge and not the other', () => {
    expect(windowFor(viewing({ range: 'custom', from: NOW - HOUR }), NOW)).toEqual({
      from: NOW - DAY,
      to: NOW,
    });
    expect(windowFor(viewing({ range: 'custom', to: NOW }), NOW)).toEqual({
      from: NOW - DAY,
      to: NOW,
    });
  });

  it('opens this week at the local week start rather than a fixed reach back', () => {
    const week = windowFor(viewing({ range: 'this-week' }), MIDWEEK);
    const opened = new Date(week.from);

    expect([
      opened.getDay(),
      opened.getHours(),
      opened.getMinutes(),
      opened.getSeconds(),
      opened.getMilliseconds(),
    ]).toEqual([0, 0, 0, 0, 0]);
    expect(week.to).toBe(MIDWEEK);
  });

  it('opens this month at the local month start, and keeps closing at now', () => {
    const month = windowFor(viewing({ range: 'this-month' }), MIDWEEK);
    const opened = new Date(month.from);

    expect([
      opened.getDate(),
      opened.getHours(),
      opened.getMinutes(),
      opened.getSeconds(),
      opened.getMilliseconds(),
    ]).toEqual([1, 0, 0, 0, 0]);
    expect(month.to).toBe(MIDWEEK);
  });
});

describe('what a view asks main for', () => {
  it('asks nothing for the live hour, which folds the row cache instead', () => {
    expect(reportAskFor(viewing({ range: '1h' }), NOW, -180)).toBeUndefined();
  });

  it('reaches back twice the window, so a tile can compare it against the one before', () => {
    expect(reportAskFor(viewing({ range: '24h' }), NOW, -180)).toEqual({
      range: '7d',
      bucketWidth: 'hour',
      dayOffsetMinutes: -180,
    });
    expect(reportAskFor(viewing({ range: '7d' }), NOW, -180)).toEqual({
      range: '30d',
      dayOffsetMinutes: -180,
    });
  });

  it('stops at the widest range it has, rather than claiming one it cannot ask for', () => {
    expect(reportAskFor(viewing({ range: '30d' }), NOW, 0)).toEqual({
      range: '30d',
      dayOffsetMinutes: 0,
    });
  });

  it('asks the narrowest range that reaches a custom window and the one before it', () => {
    const insideADay = viewing({ range: 'custom', from: NOW - 5 * HOUR, to: NOW - HOUR });

    expect(reportAskFor(insideADay, NOW, 0)?.range).toBe('24h');
  });

  it('asks for hours when a short custom window sits deeper in the week', () => {
    const yesterdayAfternoon = viewing({
      range: 'custom',
      from: NOW - 30 * HOUR,
      to: NOW - 24 * HOUR,
    });

    expect(reportAskFor(yesterdayAfternoon, NOW, 0)).toEqual({
      range: '7d',
      bucketWidth: 'hour',
      dayOffsetMinutes: 0,
    });
  });

  it('leaves a window wider than two days on the range own folded width', () => {
    const lastFortnight = viewing({ range: 'custom', from: NOW - 14 * DAY, to: NOW });

    expect(reportAskFor(lastFortnight, NOW, 0)).toEqual({ range: '30d', dayOffsetMinutes: 0 });
  });
});

describe('the window standing before the one on screen', () => {
  it('spans the same width, ending where the standing window opens', () => {
    expect(previousWindowFor(viewing({ range: '24h' }), NOW)).toEqual({
      from: NOW - 2 * DAY,
      to: NOW - DAY,
    });
  });

  it('spans a custom window own width', () => {
    const custom = viewing({ range: 'custom', from: NOW - 6 * HOUR, to: NOW - 2 * HOUR });

    expect(previousWindowFor(custom, NOW)).toEqual({ from: NOW - 10 * HOUR, to: NOW - 6 * HOUR });
  });
});

describe('the presets the range popover offers', () => {
  it('names them in the order the popover lists them', () => {
    expect(presetWindows.map((preset) => preset.label)).toEqual([
      'Last hour',
      'Last 24 hours',
      'Last 7 days',
      'Last 30 days',
      'This week',
      'This month',
    ]);
  });

  it('carries the range each preset stands for, so a standing view knows its own preset', () => {
    expect(presetWindows.map((preset) => preset.range)).toEqual([
      '1h',
      '24h',
      '7d',
      '30d',
      'this-week',
      'this-month',
    ]);
  });
});

describe('the wording the header prints for a window', () => {
  it('names a preset by its own words', () => {
    expect(windowWording(viewing({ range: '24h' }), NOW)).toBe('Last 24 hours');
    expect(windowWording(viewing({ range: '1h' }), NOW)).toBe('Last hour');
  });

  it('names the window a boundary preset stands on', () => {
    expect(windowWording(viewing({ range: 'this-week' }), NOW)).toBe('This week');
    expect(windowWording(viewing({ range: 'this-month' }), NOW)).toBe('This month');
  });

  it('prints both edges of a custom window', () => {
    const custom = viewing({ range: 'custom', from: NOW - DAY, to: NOW });

    expect(windowWording(custom, NOW)).toMatch(/\d{2}:\d{2} – .+ \d{2}:\d{2}$/u);
  });
});

describe('what a tile calls the window standing before this one', () => {
  it('names a fixed reach by its own width', () => {
    expect(previousWindowWord('24h')).toBe('24h');
    expect(previousWindowWord('30d')).toBe('30d');
  });

  it('calls a drawn or boundary window a window, which is all it can be called', () => {
    expect(previousWindowWord('custom')).toBe('window');
    expect(previousWindowWord('this-week')).toBe('window');
    expect(previousWindowWord('this-month')).toBe('window');
  });
});
