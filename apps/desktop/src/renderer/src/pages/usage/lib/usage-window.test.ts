import { describe, expect, it } from 'vitest';

import type { UsageSearch } from './usage-search';

import {
  presetWindows,
  previousWindowFor,
  reportAskFor,
  searchForPreset,
  windowFor,
  windowWording,
} from './usage-window';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const NOW = 1_754_600_400_000;

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

  it('moves a preset range straight onto the view', () => {
    expect(searchForPreset(viewing(), 'last-7-days', NOW)).toEqual(viewing({ range: '7d' }));
  });

  it('turns this week into a window opening at the local week start', () => {
    const search = searchForPreset(viewing(), 'this-week', NOW);
    const opened = new Date(search.from ?? 0);

    expect(search.range).toBe('custom');
    expect(search.to).toBe(NOW);
    expect(opened.getDay()).toBe(0);
    expect([opened.getHours(), opened.getMinutes(), opened.getSeconds()]).toEqual([0, 0, 0]);
    expect(search.from).toBeLessThanOrEqual(NOW);
  });

  it('turns this month into a window opening at the local month start', () => {
    const search = searchForPreset(viewing(), 'this-month', NOW);
    const opened = new Date(search.from ?? 0);

    expect(search.range).toBe('custom');
    expect(opened.getDate()).toBe(1);
    expect(opened.getHours()).toBe(0);
  });

  it('keeps the filters and the chart standing when the window moves', () => {
    const filtered = viewing({ gateways: ['relay'], metric: 'tokens', stackedBy: 'provider' });
    const moved = searchForPreset(filtered, 'last-30-days', NOW);

    expect(moved.gateways).toEqual(['relay']);
    expect(moved.metric).toBe('tokens');
    expect(moved.stackedBy).toBe('provider');
  });
});

describe('the wording the header prints for a window', () => {
  it('names a preset by its own words', () => {
    expect(windowWording(viewing({ range: '24h' }), NOW)).toBe('Last 24 hours');
    expect(windowWording(viewing({ range: '1h' }), NOW)).toBe('Last hour');
  });

  it('prints both edges of a custom window', () => {
    const custom = viewing({ range: 'custom', from: NOW - DAY, to: NOW });

    expect(windowWording(custom, NOW)).toMatch(/\d{2}:\d{2} – .+ \d{2}:\d{2}$/u);
  });
});
