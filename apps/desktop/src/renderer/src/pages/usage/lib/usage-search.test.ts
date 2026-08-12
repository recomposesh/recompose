import { describe, expect, it } from 'vitest';

import {
  filteredMembers,
  narrowedScope,
  spendSnappedRange,
  usageSearchFrom,
  withoutFilter,
} from './usage-search';

describe('given an address with nothing usage understands', () => {
  it('lands on the default view: the last day, counting requests, stacked by gateway', () => {
    expect(usageSearchFrom({})).toEqual({ range: '24h', metric: 'requests', stackedBy: 'gateway' });
  });

  it('drops junk values rather than carrying them', () => {
    const search = usageSearchFrom({ range: 'yesterday', metric: 7, stackedBy: 'nothing' });

    expect(search).toEqual({ range: '24h', metric: 'requests', stackedBy: 'gateway' });
  });

  it('drops a metric the chart cannot draw', () => {
    expect(usageSearchFrom({ metric: 'errors' }).metric).toBe('requests');
  });
});

describe('given an address carrying filters', () => {
  it('keeps every named gateway and provider', () => {
    const search = usageSearchFrom({
      range: '7d',
      metric: 'tokens',
      gateways: ['relay', 'backup'],
      providers: ['k1'],
    });

    expect(search).toEqual({
      range: '7d',
      metric: 'tokens',
      stackedBy: 'gateway',
      gateways: ['relay', 'backup'],
      providers: ['k1'],
    });
  });

  it('reads one name as a filter of one', () => {
    expect(usageSearchFrom({ gateways: 'relay' }).gateways).toEqual(['relay']);
  });

  it('drops blank names and keeps the rest', () => {
    expect(usageSearchFrom({ gateways: ['relay', '', 7] }).gateways).toEqual(['relay']);
  });

  it('carries no filter key when nothing survives', () => {
    expect(usageSearchFrom({ gateways: ['', ''] })).not.toHaveProperty('gateways');
  });
});

describe('given an address carrying a custom window', () => {
  it('keeps the window when both edges stand', () => {
    const search = usageSearchFrom({
      range: 'custom',
      from: 1_700_000_000_000,
      to: 1_700_086_400_000,
    });

    expect(search).toEqual({
      range: 'custom',
      from: 1_700_000_000_000,
      to: 1_700_086_400_000,
      metric: 'requests',
      stackedBy: 'gateway',
    });
  });

  it('falls back to the last day when an edge is missing', () => {
    expect(usageSearchFrom({ range: 'custom', from: 1_700_000_000_000 }).range).toBe('24h');
  });

  it('falls back to the last day when the window runs backwards', () => {
    const search = usageSearchFrom({
      range: 'custom',
      from: 1_700_086_400_000,
      to: 1_700_000_000_000,
    });

    expect(search.range).toBe('24h');
  });

  it('leaves a stray window off a standing preset range', () => {
    const search = usageSearchFrom({ range: '7d', from: 1_700_000_000_000, to: 1_700_086_400_000 });

    expect(search).toEqual({ range: '7d', metric: 'requests', stackedBy: 'gateway' });
  });
});

describe('the members one filter stands on', () => {
  it('reads the named members', () => {
    expect(
      filteredMembers(
        { range: '24h', metric: 'requests', stackedBy: 'gateway', gateways: ['relay'] },
        'gateways',
      ),
    ).toEqual(['relay']);
  });

  it('reads empty when the filter stands on everything', () => {
    expect(
      filteredMembers({ range: '24h', metric: 'requests', stackedBy: 'gateway' }, 'providers'),
    ).toEqual([]);
  });
});

describe('clearing one filter', () => {
  it('drops the key rather than carrying an empty list', () => {
    const cleared = withoutFilter(
      {
        range: '24h',
        metric: 'requests',
        stackedBy: 'gateway',
        gateways: ['relay'],
        providers: ['k1'],
      },
      'gateways',
    );

    expect(cleared).not.toHaveProperty('gateways');
    expect(cleared.providers).toEqual(['k1']);
  });
});

describe('the scope sentence the header prints', () => {
  it('names the standing filters in reading order', () => {
    const scope = narrowedScope({
      range: '24h',
      metric: 'requests',
      stackedBy: 'gateway',
      gateways: ['relay', 'backup'],
      providers: ['k1'],
    });

    expect(scope).toEqual([
      { level: 'gateways', values: ['relay', 'backup'] },
      { level: 'providers', values: ['k1'] },
    ]);
  });

  it('reads empty when every filter stands on everything', () => {
    expect(narrowedScope({ range: '24h', metric: 'requests', stackedBy: 'gateway' })).toEqual([]);
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

  it('keeps a custom window, which draws whatever width it spans', () => {
    expect(spendSnappedRange('custom')).toBe('custom');
  });
});
