import { describe, expect, it } from 'vitest';

import { windowSlots } from './window-slots';

const HOUR = 3_600_000;

const at = (year: number, month: number, day: number, hour = 0): number =>
  new Date(year, month, day, hour, 0, 0, 0).getTime();

describe('given a window an hour wide asked in minute buckets', () => {
  it('names every minute the window opens over', () => {
    const from = at(2026, 7, 12, 9);
    const slots = windowSlots({ from, to: from + HOUR }, 'minute');

    expect(slots).toHaveLength(60);
    expect(slots[0]).toBe(from);
    expect(slots.at(-1)).toBe(from + 59 * 60_000);
  });
});

describe('given a window a day wide asked in hour buckets', () => {
  it('names every hour, so a bucket that served nothing keeps its slot', () => {
    const from = at(2026, 7, 12);
    const slots = windowSlots({ from, to: from + 24 * HOUR }, 'hour');

    expect(slots).toHaveLength(24);
    expect(slots[0]).toBe(from);
    expect(slots[23]).toBe(from + 23 * HOUR);
  });

  it('opens the first slot on the hour boundary the window fell inside', () => {
    const slots = windowSlots(
      { from: at(2026, 7, 12, 9) + 37 * 60_000, to: at(2026, 7, 12, 12) },
      'hour',
    );

    expect(slots[0]).toBe(at(2026, 7, 12, 9));
  });
});

describe('given a window a week wide asked in day buckets', () => {
  it('breaks every slot at the local midnight the reader lives in', () => {
    const slots = windowSlots({ from: at(2026, 7, 6, 15), to: at(2026, 7, 12, 9) }, 'day');

    expect(slots).toHaveLength(7);
    expect(slots[0]).toBe(at(2026, 7, 6));
    expect(slots.at(-1)).toBe(at(2026, 7, 12));
  });
});

describe('given a window that closes before it opens', () => {
  it('names one slot rather than running away', () => {
    const from = at(2026, 7, 12, 9);

    expect(windowSlots({ from, to: from - HOUR }, 'hour')).toEqual([from]);
  });
});
