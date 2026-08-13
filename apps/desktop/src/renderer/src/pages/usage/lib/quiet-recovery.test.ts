import { describe, expect, it } from 'vitest';

import type { UsageSearch } from './usage-search';

import { quietRecovery, quietSentence } from './quiet-recovery';

const viewing = (over: Partial<UsageSearch> = {}): UsageSearch => ({
  range: '24h',
  metric: 'requests',
  stackedBy: 'gateway',
  ...over,
});

describe('given a quiet window that no filter narrowed', () => {
  it('offers the next range up, because the history may sit just outside', () => {
    expect(quietRecovery(viewing({ range: '24h' }))).toEqual({
      label: 'Widen to 7 days',
      next: { ...viewing(), range: '7d' },
    });
  });

  it('walks the same ladder from the hour and from the week', () => {
    expect(quietRecovery(viewing({ range: '1h' }))?.next.range).toBe('24h');
    expect(quietRecovery(viewing({ range: '7d' }))?.next.range).toBe('30d');
  });
});

describe('given a quiet window at the widest range the ledger keeps', () => {
  it('offers nothing, because no wider window exists to reach for', () => {
    expect(quietRecovery(viewing({ range: '30d' }))).toBeUndefined();
  });
});

describe('given a quiet window a filter narrowed', () => {
  it('offers the filters back before the window, because they hide more', () => {
    const narrowed = viewing({ gateways: ['relay'], range: '24h' });

    expect(quietRecovery(narrowed)).toEqual({
      label: 'Clear the filters',
      next: viewing({ range: '24h' }),
    });
  });

  it('clears a provider filter the same way', () => {
    const narrowed = viewing({ providers: ['a-work-account'], range: '30d' });

    expect(quietRecovery(narrowed)).toEqual({
      label: 'Clear the filters',
      next: viewing({ range: '30d' }),
    });
  });
});

describe('given a quiet custom window', () => {
  it('offers the filters when they stand, and nothing when they do not', () => {
    const drawn = viewing({ range: 'custom', from: 1, to: 2 });

    expect(quietRecovery(drawn)).toBeUndefined();
    expect(quietRecovery({ ...drawn, gateways: ['relay'] })?.label).toBe('Clear the filters');
  });
});

describe('given a quiet window that has to say which window it means', () => {
  it('names the preset in the reader’s own words', () => {
    expect(quietSentence(viewing({ range: '1h' }))).toBe('Nothing served in the last hour.');
    expect(quietSentence(viewing({ range: '24h' }))).toBe('Nothing served in the last 24 hours.');
    expect(quietSentence(viewing({ range: '30d' }))).toBe('Nothing served in the last 30 days.');
  });

  it('leaves a drawn window to the edges already printed under the title', () => {
    expect(quietSentence(viewing({ range: 'custom', from: 1, to: 2 }))).toBe(
      'Nothing served in the window you drew.',
    );
  });
});
