import type { UsageBucket, UsageDayCost, UsageMeasures, UsageTuple } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import { captionFor } from './usage-caption';
import { chartFor, metricFaces, spendReading } from './usage-faces';

const DAY_MS = 86_400_000;
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

describe('the five faces headline the window', () => {
  it('prints requests and errors exactly, latency as a named average', () => {
    const faces = metricFaces({
      buckets: [bucket(TODAY)],
      dayCosts: [],
      dayWidth: false,
      todayStart: TODAY,
    });

    expect(faces.requests.reading).toBe('10');
    expect(faces.errors.reading).toBe('1');
    expect(faces.latency.reading).toBe('850ms');
    expect(faces.latency.detail).toBe('average');
  });

  it('splits the cached share out of the tokens face', () => {
    const faces = metricFaces({
      buckets: [bucket(TODAY)],
      dayCosts: [],
      dayWidth: false,
      todayStart: TODAY,
    });

    expect(faces.tokens.reading).toBe('1.0k');
    expect(faces.tokens.detail).toBe('25% cached');
  });

  it('reads a dash rather than a false zero while nothing answered', () => {
    const faces = metricFaces({
      buckets: [bucket(TODAY, {}, measured({ answered: 0, durationMsSum: 0 }))],
      dayCosts: [],
      dayWidth: false,
      todayStart: TODAY,
    });

    expect(faces.latency.reading).toBe('—');
  });

  it('keeps the tokens face silent about the split it never measured', () => {
    const withoutSplit = measured({
      tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 1_000 },
    });
    const faces = metricFaces({
      buckets: [bucket(TODAY, {}, withoutSplit)],
      dayCosts: [],
      dayWidth: false,
      todayStart: TODAY,
    });

    expect(faces.tokens.reading).toBe('1.0k');
    expect(faces.tokens.detail).toBeUndefined();
  });
});

describe('the spend face names its window', () => {
  it('carries both bases on the spend face at day width', () => {
    const faces = metricFaces({
      buckets: [],
      dayCosts: [keyedCost, seatCost],
      dayWidth: true,
      todayStart: TODAY,
    });

    expect(faces.spend.reading).toBe('$1.92');
    expect(faces.spend.detail).toBe('≈$0.80 equivalent');
  });

  it('prints today so far on the spend face at a sub-day range', () => {
    const faces = metricFaces({
      buckets: [],
      dayCosts: [keyedCost],
      dayWidth: false,
      todayStart: TODAY,
    });

    expect(faces.spend.reading).toBe('$1.92');
    expect(faces.spend.detail).toBe('today so far');
  });
});

describe('cost tells the truth about its basis', () => {
  it('keeps billed and equivalent as two labelled figures that never merge', () => {
    const reading = spendReading([keyedCost, seatCost]);

    expect(reading.billed).toBe('$1.92');
    expect(reading.equivalent).toBe('≈$0.80');
  });

  it('prints a sub-cent figure as less than one cent, never as zero dollars', () => {
    const subCent: UsageDayCost = { ...keyedCost, billedMicroDollars: 4_200 };

    expect(spendReading([subCent]).billed).toBe('<$0.01');
  });

  it('gives local traffic no cost figure at all', () => {
    const reading = spendReading([]);

    expect(reading.billed).toBeUndefined();
    expect(reading.equivalent).toBeUndefined();
  });
});

describe('the caption states what the chart claims', () => {
  const inputs = { buckets: [bucket(TODAY)], dayCosts: [keyedCost, seatCost] };

  it('names the range, the width, the total, the peak, and the UTC rule', () => {
    const faces = metricFaces({ ...inputs, dayWidth: true, todayStart: TODAY });
    const drawn = chartFor('requests', inputs.buckets, [], TODAY);

    expect(captionFor('requests', '7d', faces, drawn.bars)).toBe(
      'Last 7 days · hour buckets · 10 requests total · peak 10 · day boundaries follow UTC',
    );
  });

  it('names the spend peak on the billed basis and never adds the bases', () => {
    const faces = metricFaces({ ...inputs, dayWidth: true, todayStart: TODAY });
    const drawn = chartFor('spend', [], inputs.dayCosts, TODAY);

    expect(captionFor('spend', '7d', faces, drawn.bars)).toBe(
      'Last 7 days · day buckets · $1.92 total · peak $1.92 · day boundaries follow UTC',
    );
  });

  it('carries the approximation prefix onto an equivalent-only peak', () => {
    const faces = metricFaces({
      buckets: [],
      dayCosts: [seatCost],
      dayWidth: true,
      todayStart: TODAY,
    });
    const drawn = chartFor('spend', [], [seatCost], TODAY);

    expect(captionFor('spend', '7d', faces, drawn.bars)).toContain('peak ≈$0.80');
  });

  it('prints a sub-cent spend peak as less than one cent, never as zero dollars', () => {
    const tinyDay = { ...keyedCost, billedMicroDollars: 4_000 };
    const faces = metricFaces({
      buckets: [],
      dayCosts: [tinyDay],
      dayWidth: true,
      todayStart: TODAY,
    });
    const drawn = chartFor('spend', [], [tinyDay], TODAY);

    expect(captionFor('spend', '7d', faces, drawn.bars)).toContain('peak <$0.01');
  });

  it('names the latency figure an average with a duration peak', () => {
    const faces = metricFaces({ ...inputs, dayWidth: false, todayStart: TODAY });
    const drawn = chartFor('latency', inputs.buckets, [], TODAY);

    expect(captionFor('latency', '24h', faces, drawn.bars)).toBe(
      'Last 24 hours · hour buckets · 850ms average · peak 850ms · day boundaries follow UTC',
    );
  });

  it('names minute buckets on the live range and day buckets on the month', () => {
    const faces = metricFaces({ ...inputs, dayWidth: false, todayStart: TODAY });

    expect(captionFor('requests', '1h', faces, [])).toContain('minute buckets');
    expect(captionFor('requests', '30d', faces, [])).toContain('day buckets');
  });
});

describe('the chart draws the selected tile', () => {
  it('stacks the token split into three token series', () => {
    const drawn = chartFor('tokens', [bucket(TODAY)], [], TODAY);

    expect(drawn.series.map((one) => one.key)).toEqual(['input', 'cached', 'output']);
    expect(drawn.bars[0]?.values).toEqual({ input: 500, cached: 250, output: 250 });
  });

  it('draws spend by day on two labelled series with the equivalent hatched', () => {
    const drawn = chartFor('spend', [], [keyedCost, seatCost], TODAY);

    expect(drawn.series.map((one) => one.key)).toEqual(['billed', 'equivalent']);
    expect(drawn.series[1]?.hatched).toBe(true);
    expect(drawn.bars[0]?.values['billed']).toBeCloseTo(1.92);
    expect(drawn.bars[0]?.values['equivalent']).toBeCloseTo(0.804);
  });

  it('draws the error series alone for the errors tile', () => {
    const drawn = chartFor('errors', [bucket(TODAY)], [], TODAY);

    expect(drawn.series).toHaveLength(1);
    expect(drawn.series[0]?.fill).toBe('var(--color-series-errors)');
    expect(drawn.bars[0]?.values['errors']).toBe(1);
  });

  it('draws the latency tile as the per-bucket average', () => {
    const drawn = chartFor('latency', [bucket(TODAY)], [], TODAY);

    expect(drawn.series[0]?.label).toBe('Average latency');
    expect(drawn.bars[0]?.values['latency']).toBe(850);
  });

  it('draws a latency bucket that answered nothing as zero, never dividing by it', () => {
    const unanswered = bucket(TODAY, {}, measured({ answered: 0, durationMsSum: 0 }));
    const drawn = chartFor('latency', [unanswered], [], TODAY);

    expect(drawn.bars[0]?.values['latency']).toBe(0);
  });
});

describe('the chart folds buckets into bars', () => {
  it('folds two tuples in one hour into one bar', () => {
    const drawn = chartFor(
      'requests',
      [bucket(TODAY), bucket(TODAY, { gateway: 'backup' })],
      [],
      TODAY,
    );

    expect(drawn.bars).toHaveLength(1);
    expect(drawn.bars[0]?.values['requests']).toBe(20);
  });

  it('orders hour buckets oldest first however the fold arrives', () => {
    const drawn = chartFor('requests', [bucket(TODAY + HOUR_MS), bucket(TODAY)], [], TODAY);

    expect(drawn.bars.map((bar) => bar.at)).toEqual([TODAY, TODAY + HOUR_MS]);
  });

  it('orders spend days oldest first however the fold arrives', () => {
    const earlier: UsageDayCost = { ...keyedCost, dayStart: TODAY - DAY_MS };
    const drawn = chartFor('spend', [], [keyedCost, earlier], TODAY);

    expect(drawn.bars.map((bar) => bar.at)).toEqual([TODAY - DAY_MS, TODAY]);
  });

  it('labels hour buckets by clock and day buckets by date', () => {
    const hours = chartFor('requests', [bucket(TODAY)], [], TODAY);
    const days = chartFor('spend', [], [{ ...keyedCost, dayStart: TODAY - DAY_MS }], TODAY);

    expect(hours.bars[0]?.label).toMatch(/^\d{2}:\d{2}$/);
    expect(days.bars[0]?.label).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });
});
