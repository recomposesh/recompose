import type { UsageBucket, UsageDayCost, UsageMeasures, UsageTuple } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import { stackedChart } from './usage-chart-fold';

const HOUR_MS = 3_600_000;
const TODAY = 1_754_956_800_000;

function measured(overrides: Partial<UsageMeasures> = {}): UsageMeasures {
  return {
    requests: 10,
    failed: 1,
    answered: 8,
    durationMsSum: 6_800,
    tokens: { input: 500, output: 250, cacheRead: 200, cacheWrite: 50, reasoning: 0, total: 1_000 },
    ...overrides,
  };
}

function bucket(
  start: number,
  tuple: Partial<UsageTuple> = {},
  measures = measured(),
): UsageBucket {
  return { start, tuple: { gateway: 'relay', ...tuple }, measures };
}

const keyedCost: UsageDayCost = {
  dayStart: TODAY,
  tuple: { gateway: 'relay', accountKind: 'api-key' },
  billedMicroDollars: 1_920_000,
};

const seatCost: UsageDayCost = {
  dayStart: TODAY,
  tuple: { gateway: 'relay', accountKind: 'subscription' },
  equivalentMicroDollars: 804_000,
};

function drawing(over: Partial<Parameters<typeof stackedChart>[0]> = {}) {
  return stackedChart({
    measure: 'requests',
    buckets: [bucket(TODAY)],
    dayCosts: [],
    stackedBy: 'gateway',
    nameOf: (key) => key,
    ...over,
  });
}

describe('the chart stacks the window by the dimension a person picked', () => {
  it('draws one series per member, ranked largest first', () => {
    const drawn = drawing({
      buckets: [
        bucket(TODAY, { gateway: 'relay' }),
        bucket(TODAY, { gateway: 'backup' }, measured({ requests: 30 })),
      ],
    });

    expect(drawn.series.map((one) => one.key)).toEqual(['backup', 'relay']);
    expect(drawn.bars[0]?.values).toEqual({ backup: 30, relay: 10 });
  });

  it('folds every member past the fifth under one named rest', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f'].map((gateway, place) =>
      bucket(TODAY, { gateway }, measured({ requests: 10 - place })),
    );
    const drawn = drawing({ buckets: many });

    expect(drawn.series).toHaveLength(6);
    expect(drawn.series.at(-1)?.label).toBe('Other');
    expect(drawn.bars[0]?.values['rest']).toBe(5);
  });

  it('reads the member name a person knows it by, not the id it is stored under', () => {
    const drawn = drawing({
      buckets: [bucket(TODAY, { accountId: 'k1' })],
      stackedBy: 'account',
      nameOf: (key) => (key === 'k1' ? 'Work key' : key),
    });

    expect(drawn.series[0]?.label).toBe('Work key');
  });

  it('carries the window total of every series, which the legend prints', () => {
    const drawn = drawing({
      buckets: [bucket(TODAY), bucket(TODAY + HOUR_MS)],
    });

    expect(drawn.totals['relay']).toBe(20);
  });
});

describe('the measures each fold their own way', () => {
  it('stacks tokens by the same dimension rather than by the token split', () => {
    const drawn = drawing({ measure: 'tokens' });

    expect(drawn.bars[0]?.values['relay']).toBe(1_000);
  });

  it('draws latency as one averaged series, because averages never stack', () => {
    const drawn = drawing({
      measure: 'latency',
      buckets: [bucket(TODAY, { gateway: 'relay' }), bucket(TODAY, { gateway: 'backup' })],
    });

    expect(drawn.series).toHaveLength(1);
    expect(drawn.bars[0]?.values['latency']).toBe(850);
  });

  it('draws spend by day on two labelled bases with the equivalent hatched', () => {
    const drawn = drawing({ measure: 'spend', buckets: [], dayCosts: [keyedCost, seatCost] });

    expect(drawn.series.map((one) => one.key)).toEqual(['billed', 'equivalent']);
    expect(drawn.series[1]?.hatched).toBe(true);
    expect(drawn.bars[0]?.values['billed']).toBeCloseTo(1.92);
  });
});

describe('the chart folds buckets into bars', () => {
  it('orders buckets oldest first however the fold arrives', () => {
    const drawn = drawing({ buckets: [bucket(TODAY + HOUR_MS), bucket(TODAY)] });

    expect(drawn.bars.map((bar) => bar.at)).toEqual([TODAY, TODAY + HOUR_MS]);
  });

  it('labels an hour bucket by the local clock', () => {
    expect(drawing().bars[0]?.label).toMatch(/^\d{2}:\d{2}$/u);
  });

  it('labels a day bucket by its local date', () => {
    const drawn = drawing({ measure: 'spend', buckets: [], dayCosts: [keyedCost] });

    expect(drawn.bars[0]?.label).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/u);
  });
});
