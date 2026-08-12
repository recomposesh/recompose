import { describe, expect, it } from 'vitest';

import type { UsageSearch } from '../../lib/usage-search';

import { movedSearch } from './usage-page-moves';

const standing: UsageSearch = { range: '24h', metric: 'requests', gateway: 'relay' };

describe('a menu command moves the same address the controls write', () => {
  it('moves the range for every range command', () => {
    const moved = (['range-24h', 'range-7d', 'range-30d'] as const).map(
      (command) => movedSearch(command, { ...standing, range: '7d' })?.range,
    );

    expect(moved).toEqual(['24h', '7d', '30d']);
  });

  it('selects the metric for every metric command, keeping the scope', () => {
    const moved = (
      ['metric-requests', 'metric-errors', 'metric-latency', 'metric-tokens'] as const
    ).map((command) => movedSearch(command, { ...standing, range: '7d', metric: 'spend' }));

    expect(moved).toEqual([
      { range: '7d', metric: 'requests', gateway: 'relay' },
      { range: '7d', metric: 'errors', gateway: 'relay' },
      { range: '7d', metric: 'latency', gateway: 'relay' },
      { range: '7d', metric: 'tokens', gateway: 'relay' },
    ]);
  });

  it('snaps a sub-day range onto day width when spend is picked', () => {
    expect(movedSearch('metric-spend', standing)).toEqual({
      range: '7d',
      metric: 'spend',
      gateway: 'relay',
    });
  });

  it('moves no view for the commands the page handles itself', () => {
    expect(movedSearch('toggle-table-twin', standing)).toBeUndefined();
    expect(movedSearch('refresh', standing)).toBeUndefined();
  });
});
