import { describe, expect, it } from 'vitest';

import { atClock, clockOf } from './clock-edges';

const AFTERNOON = new Date(2026, 7, 12, 14, 5, 30).getTime();

describe('the clock one edge stands at', () => {
  it('prints hours and minutes padded, as a time field reads them', () => {
    expect(clockOf(AFTERNOON)).toBe('14:05');
  });

  it('pads a small hour rather than printing it bare', () => {
    expect(clockOf(new Date(2026, 7, 12, 9, 0).getTime())).toBe('09:00');
  });
});

describe('moving an edge onto another clock', () => {
  it('keeps the day and takes the named hour and minute', () => {
    const moved = new Date(atClock(AFTERNOON, '07:45'));

    expect([moved.getDate(), moved.getHours(), moved.getMinutes()]).toEqual([12, 7, 45]);
  });

  it('clears the seconds the earlier instant carried', () => {
    const moved = new Date(atClock(AFTERNOON, '14:05'));

    expect([moved.getSeconds(), moved.getMilliseconds()]).toEqual([0, 0]);
  });

  it('leaves the edge where it stood when the clock reads as nothing', () => {
    expect(atClock(AFTERNOON, '')).toBe(AFTERNOON);
    expect(atClock(AFTERNOON, 'ab')).toBe(AFTERNOON);
    expect(atClock(AFTERNOON, 'not a clock')).toBe(AFTERNOON);
  });

  it('keeps the hour a clock names even where its minutes read as nothing', () => {
    const moved = new Date(atClock(AFTERNOON, '07:oops'));

    expect([moved.getHours(), moved.getMinutes()]).toEqual([7, 0]);
  });
});
