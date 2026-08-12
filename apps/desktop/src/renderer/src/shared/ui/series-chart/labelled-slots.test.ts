import { describe, expect, it } from 'vitest';

import { labelledSlots } from './labelled-slots';

const hours = (count: number): readonly number[] => Array.from({ length: count }, (_, at) => at);

describe('given a day of hour slots', () => {
  it('paces the labels four hours apart and names the newest hour', () => {
    expect(labelledSlots(hours(24))).toEqual([0, 4, 8, 12, 16, 20, 23]);
  });
});

describe('given a week of day slots', () => {
  it('labels every slot, because a week never crowds its axis', () => {
    expect(labelledSlots(hours(7))).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('given a half day of hour slots, where the pace misses the newest slot', () => {
  it('adds the newest slot to the paced ones rather than dropping a pace', () => {
    expect(labelledSlots(hours(14))).toEqual([0, 2, 4, 6, 8, 10, 12, 13]);
  });
});

describe('given a month of day slots', () => {
  it('keeps the reading count while still naming the newest day', () => {
    expect(labelledSlots(hours(30))).toEqual([0, 5, 10, 15, 20, 25, 29]);
  });
});

describe('given no slots at all', () => {
  it('labels nothing rather than dividing by an empty axis', () => {
    expect(labelledSlots([])).toEqual([]);
  });
});
