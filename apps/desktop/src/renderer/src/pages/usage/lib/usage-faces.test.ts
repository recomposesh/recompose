import type { UsageBucket, UsageDayCost, UsageMeasures, UsageTuple } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import { metricFaces, spendReading } from './usage-faces';

const DAY_MS = 86_400_000;
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

function facesOver(over: Partial<Parameters<typeof metricFaces>[0]> = {}) {
  return metricFaces({
    buckets: [bucket(TODAY)],
    previous: [],
    dayCosts: [],
    dayWidth: false,
    todayStart: TODAY,
    windowWord: '24h',
    ...over,
  });
}

describe('the five faces headline the window', () => {
  it('prints requests and errors exactly, latency as a named average', () => {
    const faces = facesOver();

    expect(faces.requests.reading).toBe('10');
    expect(faces.errors.reading).toBe('1');
    expect(faces.latency.reading).toBe('850ms');
    expect(faces.latency.detail).toBe('average');
  });

  it('reads the error face as a share of the requests it stands beside', () => {
    expect(facesOver().errors.detail).toBe('10% of requests');
  });

  it('leaves the error share off a window that served nothing', () => {
    expect(facesOver({ buckets: [] }).errors.detail).toBeUndefined();
  });

  it('splits the cached share out of the tokens face', () => {
    const faces = facesOver();

    expect(faces.tokens.reading).toBe('1.0k');
    expect(faces.tokens.detail).toBe('25% cached');
  });

  it('reads a dash rather than a false zero while nothing answered', () => {
    const faces = facesOver({
      buckets: [bucket(TODAY, {}, measured({ answered: 0, durationMsSum: 0 }))],
    });

    expect(faces.latency.reading).toBe('—');
  });

  it('keeps the tokens face silent about the split it never measured', () => {
    const withoutSplit = measured({
      tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 1_000 },
    });
    const faces = facesOver({ buckets: [bucket(TODAY, {}, withoutSplit)] });

    expect(faces.tokens.reading).toBe('1.0k');
    expect(faces.tokens.detail).toBeUndefined();
  });
});

describe('the requests face compares its window against the one before', () => {
  it('names the rise as a share of what the earlier window served', () => {
    const faces = facesOver({
      previous: [bucket(TODAY - DAY_MS, {}, measured({ requests: 8 }))],
    });

    expect(faces.requests.detail).toBe('+25% vs prev 24h');
  });

  it('names a fall with its own sign', () => {
    const faces = facesOver({
      previous: [bucket(TODAY - DAY_MS, {}, measured({ requests: 20 }))],
    });

    expect(faces.requests.detail).toBe('-50% vs prev 24h');
  });

  it('says nothing where the earlier window served nothing to compare against', () => {
    expect(facesOver({ previous: [] }).requests.detail).toBeUndefined();
  });
});

describe('the spend face names its window', () => {
  it('carries both bases on the spend face at day width', () => {
    const faces = facesOver({ buckets: [], dayCosts: [keyedCost, seatCost], dayWidth: true });

    expect(faces.spend.reading).toBe('$1.92');
    expect(faces.spend.detail).toBe('≈$0.80 equivalent');
  });

  it('prints today so far on the spend face at a sub-day range', () => {
    const faces = facesOver({ buckets: [], dayCosts: [keyedCost] });

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
