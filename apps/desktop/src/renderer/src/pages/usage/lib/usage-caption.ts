import type { ChartBar } from '../../../shared/ui';
import type { MetricFaces } from './usage-faces';
import type { UsageMetric, UsageSearchRange } from './usage-search';

import { compactCount, readDuration } from '../../../shared/lib';
import { MICRO_DOLLARS, printedMicroDollars } from './usage-faces';

const RANGE_WORDING: Record<UsageSearchRange, string> = {
  '1h': 'Last hour',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

const METRIC_UNIT: Record<UsageMetric, string> = {
  requests: 'requests',
  errors: 'errors',
  latency: '',
  tokens: 'tokens',
  spend: '',
};

function barTotal(bar: ChartBar): number {
  return Object.values(bar.values).reduce((sum, value) => sum + value, 0);
}

function highestValue(bars: readonly ChartBar[], series: string): number {
  return bars.reduce((highest, bar) => Math.max(highest, bar.values[series] ?? 0), 0);
}

/**
 * The spend peak on one basis at a time, because billed and equivalent never add together.
 *
 * @summary The peak follows the basis the total leads with: the tallest billed day where any
 * billed traffic stands, and the tallest equivalent day under the approximation prefix where the
 * window served only seat traffic.
 */
function spendPeak(bars: readonly ChartBar[]): string {
  const billedPeak = highestValue(bars, 'billed');

  if (billedPeak > 0) {
    return printedMicroDollars(Math.round(billedPeak * MICRO_DOLLARS));
  }

  return `≈${printedMicroDollars(Math.round(highestValue(bars, 'equivalent') * MICRO_DOLLARS))}`;
}

function peakReading(metric: UsageMetric, bars: readonly ChartBar[]): string {
  if (metric === 'spend') {
    return spendPeak(bars);
  }

  const peak = bars.reduce((highest, bar) => Math.max(highest, barTotal(bar)), 0);

  if (metric === 'latency') {
    return readDuration(peak);
  }

  return compactCount(peak);
}

function totalWording(metric: UsageMetric, faces: MetricFaces): string {
  if (metric === 'latency') {
    return `${faces.latency.reading} average`;
  }

  const unit = METRIC_UNIT[metric];

  return unit === '' ? `${faces[metric].reading} total` : `${faces[metric].reading} ${unit} total`;
}

function bucketWording(metric: UsageMetric, range: UsageSearchRange): string {
  if (range === '1h') {
    return 'minute';
  }

  if (range === '30d' || metric === 'spend') {
    return 'day';
  }

  return 'hour';
}

/**
 * The printed sentence stating what the chart claims: range, width, total, peak, and the UTC rule.
 *
 * @summary The caption is a conformance path, not a garnish: losing the vector loses nothing a
 * reader needs, because the caption and the table twin carry every figure as text.
 */
export function captionFor(
  metric: UsageMetric,
  range: UsageSearchRange,
  faces: MetricFaces,
  bars: readonly ChartBar[],
): string {
  return [
    RANGE_WORDING[range],
    `${bucketWording(metric, range)} buckets`,
    totalWording(metric, faces),
    `peak ${peakReading(metric, bars)}`,
    'day boundaries follow UTC',
  ].join(' · ');
}
