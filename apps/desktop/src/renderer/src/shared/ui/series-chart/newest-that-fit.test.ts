import { describe, expect, it } from 'vitest';

import type { ChartBar } from '../index';

import { newestThatFit } from '../index';

const hourBars = (count: number): readonly ChartBar[] =>
  Array.from({ length: count }, (_, hour) => ({
    at: hour,
    label: `${String(hour)}:00`,
    values: { requests: 1 },
  }));

describe('given more buckets than the width can hold at the minimum slot', () => {
  it('keeps the newest buckets that fit and drops the oldest', () => {
    const kept = newestThatFit(hourBars(100), 200);

    expect(kept).toHaveLength(50);
    expect(kept[0]?.at).toBe(50);
    expect(kept.at(-1)?.at).toBe(99);
  });
});

describe('given buckets that all fit', () => {
  it('keeps every bucket', () => {
    const bars = hourBars(24);

    expect(newestThatFit(bars, 480)).toEqual(bars);
  });
});

describe('given an unmeasured zero width', () => {
  it('keeps nothing rather than guessing', () => {
    expect(newestThatFit(hourBars(3), 0)).toHaveLength(0);
  });
});
