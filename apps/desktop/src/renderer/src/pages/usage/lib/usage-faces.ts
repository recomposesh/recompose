import type { UsageBucket, UsageDayCost, UsageMeasures } from '@recompose/contracts';

import type { ChartBar, ChartSeries } from '../../../shared/ui';
import type { UsageMetric } from './usage-search';

import { compactCount, exactCount, readDuration } from '../../../shared/lib';
import { tokenChartSeries } from '../../../shared/ui';

type MetricFace = {
  reading: string;
  detail?: string | undefined;
};

export type MetricFaces = Readonly<Record<UsageMetric, MetricFace>>;

type FaceInputs = {
  buckets: readonly UsageBucket[];
  dayCosts: readonly UsageDayCost[];
  dayWidth: boolean;
  todayStart: number;
};

export type SpendFigures = {
  billed?: string | undefined;
  equivalent?: string | undefined;
};

export type DrawnChart = {
  series: readonly ChartSeries[];
  bars: readonly ChartBar[];
};

const MICRO_DOLLARS = 1_000_000;
const ONE_CENT_MICRO = 10_000;
const NOTHING_YET = '—';

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function summedMeasures(buckets: readonly UsageBucket[]): UsageMeasures {
  return buckets.reduce<UsageMeasures>(
    (held, bucket) => ({
      requests: held.requests + bucket.measures.requests,
      failed: held.failed + bucket.measures.failed,
      answered: held.answered + bucket.measures.answered,
      durationMsSum: held.durationMsSum + bucket.measures.durationMsSum,
      tokens: {
        input: held.tokens.input + bucket.measures.tokens.input,
        output: held.tokens.output + bucket.measures.tokens.output,
        cacheRead: held.tokens.cacheRead + bucket.measures.tokens.cacheRead,
        cacheWrite: held.tokens.cacheWrite + bucket.measures.tokens.cacheWrite,
        reasoning: held.tokens.reasoning + bucket.measures.tokens.reasoning,
        total: held.tokens.total + bucket.measures.tokens.total,
      },
    }),
    {
      requests: 0,
      failed: 0,
      answered: 0,
      durationMsSum: 0,
      tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 0 },
    },
  );
}

function printedMicroDollars(micro: number): string {
  if (micro > 0 && micro < ONE_CENT_MICRO) {
    return '<$0.01';
  }

  return dollars.format(micro / MICRO_DOLLARS);
}

/**
 * Billed and equivalent as two labelled figures that never merge.
 *
 * @summary A per-token price is fabrication for a subscription seat, so the equivalent figure
 * carries the approximation prefix, and traffic that cost nothing carries no figure rather than a
 * zero.
 */
export function spendReading(dayCosts: readonly UsageDayCost[]): SpendFigures {
  const billedMicro = dayCosts.reduce((sum, cost) => sum + (cost.billedMicroDollars ?? 0), 0);
  const equivalentMicro = dayCosts.reduce(
    (sum, cost) => sum + (cost.equivalentMicroDollars ?? 0),
    0,
  );

  return {
    ...(billedMicro === 0 ? {} : { billed: printedMicroDollars(billedMicro) }),
    ...(equivalentMicro === 0 ? {} : { equivalent: `≈${printedMicroDollars(equivalentMicro)}` }),
  };
}

function latencyFace(folded: UsageMeasures): MetricFace {
  if (folded.answered === 0) {
    return { reading: NOTHING_YET, detail: 'average' };
  }

  return { reading: readDuration(folded.durationMsSum / folded.answered), detail: 'average' };
}

function tokensFace(folded: UsageMeasures): MetricFace {
  const split = folded.tokens;
  const splitSum =
    split.input + split.output + split.cacheRead + split.cacheWrite + split.reasoning;
  const cached = split.cacheRead + split.cacheWrite;

  if (splitSum === 0) {
    return { reading: compactCount(split.total) };
  }

  return {
    reading: compactCount(split.total),
    detail: `${String(Math.round((cached / splitSum) * 100))}% cached`,
  };
}

function equivalentDetail(figures: SpendFigures): Pick<MetricFace, 'detail'> {
  if (figures.billed === undefined || figures.equivalent === undefined) {
    return {};
  }

  return { detail: `${figures.equivalent} equivalent` };
}

function spendFace(inputs: FaceInputs): MetricFace {
  const counted = inputs.dayWidth
    ? inputs.dayCosts
    : inputs.dayCosts.filter((cost) => cost.dayStart === inputs.todayStart);
  const figures = spendReading(counted);
  const reading = figures.billed ?? figures.equivalent ?? NOTHING_YET;

  if (!inputs.dayWidth) {
    return { reading, detail: 'today so far' };
  }

  return { reading, ...equivalentDetail(figures) };
}

/** The five tile faces folded from the same buckets everything else reads. */
export function metricFaces(inputs: FaceInputs): MetricFaces {
  const folded = summedMeasures(inputs.buckets);

  return {
    requests: { reading: exactCount(folded.requests) },
    errors: { reading: exactCount(folded.failed) },
    latency: latencyFace(folded),
    tokens: tokensFace(folded),
    spend: spendFace(inputs),
  };
}

const TOKEN_SERIES: readonly ChartSeries[] = tokenChartSeries;

const SPEND_SERIES: readonly ChartSeries[] = [
  { key: 'billed', label: 'Billed', fill: 'var(--color-series-cost)' },
  {
    key: 'equivalent',
    label: 'Equivalent',
    fill: 'var(--color-series-cost-equivalent)',
    hatched: true,
  },
];

const SINGLE_SERIES: Readonly<Partial<Record<UsageMetric, ChartSeries>>> = {
  requests: { key: 'requests', label: 'Requests', fill: 'var(--color-series-input)' },
  errors: { key: 'errors', label: 'Errors', fill: 'var(--color-series-errors)' },
  latency: { key: 'latency', label: 'Average latency', fill: 'var(--color-series-input)' },
};

function hourLabel(start: number): string {
  return new Date(start).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

function dayLabel(start: number): string {
  return new Date(start).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function tokenValues(folded: UsageMeasures): ChartBar['values'] {
  const split = folded.tokens;

  return {
    input: split.input,
    cached: split.cacheRead + split.cacheWrite,
    output: split.output + split.reasoning,
  };
}

function singleValue(metric: UsageMetric, folded: UsageMeasures): number {
  if (metric === 'errors') {
    return folded.failed;
  }

  if (metric === 'latency') {
    return folded.answered === 0 ? 0 : folded.durationMsSum / folded.answered;
  }

  return folded.requests;
}

function measureBars(metric: UsageMetric, buckets: readonly UsageBucket[]): readonly ChartBar[] {
  const byStart = new Map<number, UsageBucket[]>();

  for (const bucket of buckets) {
    byStart.set(bucket.start, [...(byStart.get(bucket.start) ?? []), bucket]);
  }

  return [...byStart.entries()]
    .toSorted(([earlier], [later]) => earlier - later)
    .map(([start, held]) => {
      const folded = summedMeasures(held);

      return {
        at: start,
        label: hourLabel(start),
        values:
          metric === 'tokens' ? tokenValues(folded) : { [metric]: singleValue(metric, folded) },
      };
    });
}

function spendBars(dayCosts: readonly UsageDayCost[]): readonly ChartBar[] {
  const byDay = new Map<number, UsageDayCost[]>();

  for (const cost of dayCosts) {
    byDay.set(cost.dayStart, [...(byDay.get(cost.dayStart) ?? []), cost]);
  }

  return [...byDay.entries()]
    .toSorted(([earlier], [later]) => earlier - later)
    .map(([dayStart, held]) => ({
      at: dayStart,
      label: dayLabel(dayStart),
      values: {
        billed: held.reduce((sum, cost) => sum + (cost.billedMicroDollars ?? 0), 0) / MICRO_DOLLARS,
        equivalent:
          held.reduce((sum, cost) => sum + (cost.equivalentMicroDollars ?? 0), 0) / MICRO_DOLLARS,
      },
    }));
}

/**
 * What the chart draws for one selected tile: its series and its folded bars.
 *
 * @summary Spend draws by day on two labelled series with the equivalent hatched, tokens stack
 * the measured split, and every other tile draws one series, so the chart and the tile that
 * selected it can never disagree.
 */
export function chartFor(
  metric: UsageMetric,
  buckets: readonly UsageBucket[],
  dayCosts: readonly UsageDayCost[],
  _todayStart: number,
): DrawnChart {
  if (metric === 'spend') {
    return { series: SPEND_SERIES, bars: spendBars(dayCosts) };
  }

  if (metric === 'tokens') {
    return { series: TOKEN_SERIES, bars: measureBars(metric, buckets) };
  }

  const series = SINGLE_SERIES[metric];

  return { series: series === undefined ? [] : [series], bars: measureBars(metric, buckets) };
}
