import { describe, expect, it } from 'vitest';

import type { UsageSearch } from '../../lib/usage-search';

import { movedSearch } from './usage-page-moves';

const standing: UsageSearch = {
  range: '24h',
  metric: 'requests',
  stackedBy: 'gateway',
  gateways: ['relay'],
};

describe('a menu command moves the same address the controls write', () => {
  it('moves the range for every range command', () => {
    const moved = (['range-24h', 'range-7d', 'range-30d'] as const).map(
      (command) => movedSearch(command, { ...standing, range: '7d' })?.range,
    );

    expect(moved).toEqual(['24h', '7d', '30d']);
  });

  it('selects the measure for every measure command, keeping the filters', () => {
    const moved = (['metric-requests', 'metric-latency', 'metric-tokens'] as const).map((command) =>
      movedSearch(command, { ...standing, range: '7d', metric: 'spend' }),
    );

    expect(moved).toEqual([
      { ...standing, range: '7d', metric: 'requests' },
      { ...standing, range: '7d', metric: 'latency' },
      { ...standing, range: '7d', metric: 'tokens' },
    ]);
  });

  it('drops the custom edges a preset range no longer stands on', () => {
    const custom: UsageSearch = { ...standing, range: 'custom', from: 1, to: 2 };

    expect(movedSearch('range-7d', custom)).toEqual({ ...standing, range: '7d' });
  });

  it('snaps a sub-day range onto day width when spend is picked', () => {
    expect(movedSearch('metric-spend', standing)).toEqual({
      ...standing,
      range: '7d',
      metric: 'spend',
    });
  });

  it('moves no view for the commands the page handles itself', () => {
    expect(movedSearch('toggle-table-twin', standing)).toBeUndefined();
    expect(movedSearch('refresh', standing)).toBeUndefined();
  });
});
