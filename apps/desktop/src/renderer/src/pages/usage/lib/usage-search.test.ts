import { describe, expect, it } from 'vitest';

import { narrowedScope, spendSnappedRange, usageSearchFrom } from './usage-search';

describe('given an address with nothing usage understands', () => {
  it('lands on the default view: the last day, counting requests, unscoped', () => {
    expect(usageSearchFrom({})).toEqual({ range: '24h', metric: 'requests' });
  });

  it('drops junk values rather than carrying them', () => {
    const search = usageSearchFrom({ range: 'yesterday', metric: 7, gateway: '' });

    expect(search).toEqual({ range: '24h', metric: 'requests' });
  });
});

describe('given an address carrying a whole drilled view', () => {
  it('keeps the range, the metric, and every scope level', () => {
    const search = usageSearchFrom({
      range: '7d',
      metric: 'tokens',
      gateway: 'relay',
      virtualModel: 'creative',
    });

    expect(search).toEqual({
      range: '7d',
      metric: 'tokens',
      gateway: 'relay',
      virtualModel: 'creative',
    });
  });
});

describe('the scope path over the domain hierarchy', () => {
  it('orders the standing levels gateway first, account last', () => {
    const levels = narrowedScope({
      range: '24h',
      metric: 'requests',
      account: 'work@openai',
      gateway: 'relay',
      providerModel: 'gpt-5',
    });

    expect(levels.map((level) => level.level)).toEqual(['gateway', 'providerModel', 'account']);
    expect(levels.map((level) => level.value)).toEqual(['relay', 'gpt-5', 'work@openai']);
  });

  it('reads empty when no level stands', () => {
    expect(narrowedScope({ range: '24h', metric: 'requests' })).toEqual([]);
  });
});

describe('selecting spend snaps the range onto day width', () => {
  it('moves a sub-day range to 7d', () => {
    expect(spendSnappedRange('1h')).toBe('7d');
    expect(spendSnappedRange('24h')).toBe('7d');
  });

  it('keeps a standing day-width range', () => {
    expect(spendSnappedRange('7d')).toBe('7d');
    expect(spendSnappedRange('30d')).toBe('30d');
  });
});
