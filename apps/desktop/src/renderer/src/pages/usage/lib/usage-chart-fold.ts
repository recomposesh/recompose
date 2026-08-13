import type { UsageBucket, UsageDayCost, UsageMeasures } from '@recompose/contracts';

import { emptyUsageMeasures, summedUsageMeasures } from '@recompose/contracts';

import type { ChartBar, ChartSeries } from '../../../shared/ui';
import type { DrawnChart } from './usage-faces';
import type { GroupDimension } from './usage-groups';
import type { ChartMeasure } from './usage-search';
import type { UsageWindow } from './usage-window';
import type { SlotWidth } from './window-slots';

import { rankedChartSeries } from '../../../shared/ui';
import { MICRO_DOLLARS } from './usage-faces';
import { groupedBy, memberOf } from './usage-groups';
import { windowSlots } from './window-slots';

const SPEND_SERIES: readonly ChartSeries[] = [
  { key: 'billed', label: 'Billed', fill: 'var(--color-series-cost)' },
  {
    key: 'equivalent',
    label: 'Equivalent',
    fill: 'var(--color-series-cost-equivalent)',
    hatched: true,
  },
];

const LATENCY_SERIES: ChartSeries = {
  key: 'latency',
  label: 'Average latency',
  fill: 'var(--color-series-input)',
};

const hourClock = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dayDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

type StackInputs = {
  measure: ChartMeasure;
  buckets: readonly UsageBucket[];
  dayCosts: readonly UsageDayCost[];
  stackedBy: GroupDimension;
  nameOf: (key: string) => string;
  bucketWidth?: SlotWidth | undefined;
  /** The window the axis stands for, so a slot that served nothing keeps its place. */
  window?: UsageWindow | undefined;
};

const UNNAMED_KEY = 'unnamed';

const UNNAMED_LABEL = 'Not named';

function measureOf(measure: ChartMeasure, folded: UsageMeasures): number {
  return measure === 'tokens' ? folded.tokens.total : folded.requests;
}

function bucketsByStart(buckets: readonly UsageBucket[]): readonly [number, UsageBucket[]][] {
  const byStart = new Map<number, UsageBucket[]>();

  for (const bucket of buckets) {
    byStart.set(bucket.start, [...(byStart.get(bucket.start) ?? []), bucket]);
  }

  return [...byStart.entries()].toSorted(([earlier], [later]) => earlier - later);
}

function paintedKeyOf(
  bucket: UsageBucket,
  inputs: StackInputs,
  painted: ReadonlySet<string>,
  restKey: string | undefined,
): string | undefined {
  const member = memberOf(bucket.tuple, inputs.stackedBy);

  if (member !== undefined && painted.has(member)) {
    return member;
  }

  return member === undefined && painted.has(UNNAMED_KEY) ? UNNAMED_KEY : restKey;
}

function stackedBars(
  inputs: StackInputs,
  series: readonly ChartSeries[],
  restKey: string | undefined,
): readonly ChartBar[] {
  const painted = new Set(series.map((one) => one.key));

  return bucketsByStart(inputs.buckets).map(([start, held]) => {
    const values: Record<string, number> = {};

    for (const bucket of held) {
      const key = paintedKeyOf(bucket, inputs, painted, restKey);

      if (key !== undefined) {
        values[key] = (values[key] ?? 0) + measureOf(inputs.measure, bucket.measures);
      }
    }

    return { at: start, label: barLabel(start, inputs.bucketWidth), values };
  });
}

function barLabel(start: number, width: StackInputs['bucketWidth']): string {
  return width === 'day' ? dayDate.format(start) : hourClock.format(start);
}

function averagedBars(
  buckets: readonly UsageBucket[],
  width: StackInputs['bucketWidth'],
): readonly ChartBar[] {
  return bucketsByStart(buckets).map(([start, held]) => {
    const folded = held.reduce<UsageMeasures>(
      (sum, bucket) => summedUsageMeasures(sum, bucket.measures),
      emptyUsageMeasures(),
    );

    return {
      at: start,
      label: barLabel(start, width),
      values: { latency: folded.answered === 0 ? 0 : folded.durationMsSum / folded.answered },
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
      label: dayDate.format(dayStart),
      values: {
        billed: held.reduce((sum, cost) => sum + (cost.billedMicroDollars ?? 0), 0) / MICRO_DOLLARS,
        equivalent:
          held.reduce((sum, cost) => sum + (cost.equivalentMicroDollars ?? 0), 0) / MICRO_DOLLARS,
      },
    }));
}

function overTheWindow(bars: readonly ChartBar[], inputs: StackInputs): readonly ChartBar[] {
  if (inputs.window === undefined) {
    return bars;
  }

  const drawn = new Map(bars.map((bar) => [bar.at, bar]));

  return windowSlots(inputs.window, inputs.bucketWidth ?? 'hour').map(
    (at) => drawn.get(at) ?? { at, label: barLabel(at, inputs.bucketWidth), values: {} },
  );
}

/** Each series' window total, which the legend prints beside its paint. */
export function seriesTotals(bars: readonly ChartBar[]): Record<string, number> {
  return bars.reduce<Record<string, number>>((totals, bar) => {
    for (const [key, value] of Object.entries(bar.values)) {
      totals[key] = (totals[key] ?? 0) + value;
    }

    return totals;
  }, {});
}

/**
 * What the chart draws: the stacked series, the folded bars, and each series' window total.
 *
 * @summary Every additive measure stacks by the dimension a person picked, so one window reads the
 * same way whichever measure leads it. Latency averages rather than adds, so it draws one series
 * and ignores the stack. Spend exists at day width on two bases that never merge.
 */
export function stackedChart(inputs: StackInputs): DrawnChart {
  if (inputs.measure === 'spend') {
    const bars = spendBars(inputs.dayCosts);

    return { series: SPEND_SERIES, bars: overTheWindow(bars, inputs), totals: seriesTotals(bars) };
  }

  if (inputs.measure === 'latency') {
    const bars = averagedBars(inputs.buckets, inputs.bucketWidth);
    const folded = inputs.buckets.reduce<UsageMeasures>(
      (sum, bucket) => summedUsageMeasures(sum, bucket.measures),
      emptyUsageMeasures(),
    );

    return {
      series: [LATENCY_SERIES],
      bars: overTheWindow(bars, inputs),
      totals: {
        latency: folded.answered === 0 ? 0 : folded.durationMsSum / folded.answered,
      },
    };
  }

  const folded = groupedBy(inputs.buckets, inputs.stackedBy);
  const ranked = folded.map((row) => row.key ?? UNNAMED_KEY);
  const named = new Set(ranked);
  const series = rankedChartSeries(ranked).map((one) =>
    named.has(one.key)
      ? { ...one, label: one.key === UNNAMED_KEY ? UNNAMED_LABEL : inputs.nameOf(one.key) }
      : one,
  );
  const restKey = series.find((one) => !named.has(one.key))?.key;
  const bars = stackedBars(
    inputs,
    series.filter((one) => one.key !== restKey),
    restKey,
  );

  return { series, bars: overTheWindow(bars, inputs), totals: seriesTotals(bars) };
}
