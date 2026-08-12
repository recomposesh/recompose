import type { UsageBucket, UsageDayCost, UsageMeasures } from '@recompose/contracts';

import { summedUsageMeasures } from '@recompose/contracts';
import { emptyUsageMeasures } from '@recompose/contracts';

import type { ChartBar, ChartSeries } from '../../../shared/ui';
import type { UsageMetric } from './usage-search';

import { compactCount, exactCount, readDuration } from '../../../shared/lib';

type MetricFace = {
  reading: string;
  detail?: string | undefined;
};

export type MetricFaces = Readonly<Record<UsageMetric, MetricFace>>;

type FaceInputs = {
  buckets: readonly UsageBucket[];
  previous: readonly UsageBucket[];
  dayCosts: readonly UsageDayCost[];
  dayWidth: boolean;
  todayStart: number;
  windowWord: string;
};

export type SpendFigures = {
  billed?: string | undefined;
  equivalent?: string | undefined;
};

export type DrawnChart = {
  series: readonly ChartSeries[];
  bars: readonly ChartBar[];
  totals: Readonly<Record<string, number>>;
};

export const MICRO_DOLLARS = 1_000_000;

const ONE_CENT_MICRO = 10_000;
const NOTHING_YET = '—';

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function summedMeasures(buckets: readonly UsageBucket[]): UsageMeasures {
  return buckets.reduce<UsageMeasures>(
    (held, bucket) => summedUsageMeasures(held, bucket.measures),
    emptyUsageMeasures(),
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

function requestsFace(
  folded: UsageMeasures,
  earlier: UsageMeasures,
  windowWord: string,
): MetricFace {
  const reading = exactCount(folded.requests);

  if (earlier.requests === 0) {
    return { reading };
  }

  const moved = Math.round(((folded.requests - earlier.requests) / earlier.requests) * 100);

  return { reading, detail: `${moved >= 0 ? '+' : ''}${String(moved)}% vs prev ${windowWord}` };
}

function errorsFace(folded: UsageMeasures): MetricFace {
  const reading = exactCount(folded.failed);

  if (folded.requests === 0) {
    return { reading };
  }

  const share = (folded.failed / folded.requests) * 100;
  const printed = share < 1 && share > 0 ? share.toFixed(1) : String(Math.round(share));

  return { reading, detail: `${printed}% of requests` };
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

/**
 * The five tile faces folded from the same buckets everything else reads.
 *
 * @summary The requests face compares its window against the one standing before it, and says
 * nothing where that window served nothing rather than claiming a rise out of zero.
 */
export function metricFaces(inputs: FaceInputs): MetricFaces {
  const folded = summedMeasures(inputs.buckets);

  return {
    requests: requestsFace(folded, summedMeasures(inputs.previous), inputs.windowWord),
    errors: errorsFace(folded),
    latency: latencyFace(folded),
    tokens: tokensFace(folded),
    spend: spendFace(inputs),
  };
}
