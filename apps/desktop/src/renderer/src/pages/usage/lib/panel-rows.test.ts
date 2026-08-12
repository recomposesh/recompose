import type { UsageBucket, UsageTuple } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import { panelRowsOf } from './panel-rows';

function bucket(tuple: Partial<UsageTuple>, requests: number): UsageBucket {
  return {
    start: 3_600_000,
    tuple: { gateway: 'relay', ...tuple },
    measures: {
      requests,
      failed: 0,
      answered: requests,
      durationMsSum: requests * 100,
      tokens: {
        input: requests * 100,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        reasoning: 0,
        total: requests * 100,
      },
    },
  };
}

describe('the rows one panel prints', () => {
  it('prints the count exactly and the tokens compactly', () => {
    const rows = panelRowsOf([bucket({ gateway: 'relay' }, 1_204)], 'gateway', (key) => key);

    expect(rows.at(0)).toEqual({
      key: 'relay',
      name: 'relay',
      requests: '1,204',
      tokens: '120.4k',
      share: 1,
    });
  });

  it('reads the name a person knows the member by', () => {
    const rows = panelRowsOf([bucket({ accountId: 'k1' }, 4)], 'account', () => 'Work key');

    expect(rows.at(0)?.name).toBe('Work key');
  });

  it('names the absence where traffic never reached the dimension', () => {
    const rows = panelRowsOf([bucket({}, 4)], 'virtualModel', (key) => key);

    expect(rows.at(0)?.name).toBe('Direct traffic');
  });
});
