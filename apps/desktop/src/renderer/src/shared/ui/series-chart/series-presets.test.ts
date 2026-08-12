import { describe, expect, it } from 'vitest';

import { rankedChartSeries } from '../index';

describe('given fewer members than the categorical scale holds', () => {
  it('paints each member from its own slot, in rank order', () => {
    const drawn = rankedChartSeries(['claude-code', 'cursor', 'raycast']);

    expect(drawn.map((one) => one.key)).toEqual(['claude-code', 'cursor', 'raycast']);
    expect(drawn.map((one) => one.fill)).toEqual([
      'var(--color-series-slot-1)',
      'var(--color-series-slot-2)',
      'var(--color-series-slot-3)',
    ]);
  });
});

describe('given exactly as many members as the scale holds', () => {
  it('spends every slot and folds nothing', () => {
    const drawn = rankedChartSeries(['a', 'b', 'c', 'd', 'e']);

    expect(drawn).toHaveLength(5);
    expect(drawn.at(-1)?.fill).toBe('var(--color-series-slot-5)');
    expect(drawn.map((one) => one.key)).not.toContain('rest');
  });
});

describe('given more members than the scale holds', () => {
  it('keeps the leading members and folds the tail under one named rest', () => {
    const drawn = rankedChartSeries(['a', 'b', 'c', 'd', 'e', 'f', 'g']);

    expect(drawn).toHaveLength(6);
    expect(drawn.at(-1)).toEqual({
      key: 'rest',
      label: 'Other',
      fill: 'var(--color-series-rest)',
    });
    expect(drawn.map((one) => one.key)).toEqual(['a', 'b', 'c', 'd', 'e', 'rest']);
  });
});

describe('given a member that already answers to the rest key', () => {
  it('moves the fold to a free key, so no member merges into the rest unseen', () => {
    const drawn = rankedChartSeries(['rest', 'b', 'c', 'd', 'e', 'f']);

    const fold = drawn.at(-1);

    expect(fold?.label).toBe('Other');
    expect(fold?.key).not.toBe('rest');
    expect(fold?.key).toMatch(/^rest.+/);
    expect(drawn.filter((one) => one.key === fold?.key)).toHaveLength(1);
    expect(drawn[0]).toEqual({
      key: 'rest',
      label: 'rest',
      fill: 'var(--color-series-slot-1)',
    });
  });
});

describe('given no members', () => {
  it('draws nothing rather than an empty rest', () => {
    expect(rankedChartSeries([])).toHaveLength(0);
  });
});

describe('given a member the legend prints', () => {
  it('labels the series with the member name it was ranked under', () => {
    expect(rankedChartSeries(['sonnet-fast'])[0]).toEqual({
      key: 'sonnet-fast',
      label: 'sonnet-fast',
      fill: 'var(--color-series-slot-1)',
    });
  });
});
