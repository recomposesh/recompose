import { RadioGroup } from '@base-ui/react/radio-group';

import type { UsageMetric } from '../../lib/usage-search';

import { MetricTile } from '../../../../shared/ui';

type MetricFace = {
  /** The headline figure, already printed. */
  reading: string;
  /** A qualifying line under the figure, when the metric carries one. */
  detail?: string | undefined;
};

export type MetricFaces = Readonly<Record<UsageMetric, MetricFace>>;

type MetricTilesProps = {
  /** The metric whose tile stands selected. */
  metric: UsageMetric;
  /** Receives the metric a person picked. */
  onMetricChange: (metric: UsageMetric) => void;
  /** What each tile's face prints. */
  faces: MetricFaces;
};

const METRIC_LABELS: Readonly<Record<UsageMetric, string>> = {
  requests: 'Requests',
  errors: 'Errors',
  latency: 'Latency',
  tokens: 'Tokens',
  spend: 'Spend',
};

const METRICS_IN_READING_ORDER: readonly UsageMetric[] = [
  'requests',
  'errors',
  'latency',
  'tokens',
  'spend',
];

/**
 * The five stat tiles standing as one radio group, where each face also selects the chart.
 *
 * @summary The tiles headline the standing window, and the checked one names what the chart
 * draws, so a figure and its series can never disagree. In a narrow window the row wraps rather
 * than shrinking any face below reading size.
 */
export function MetricTiles({ metric, onMetricChange, faces }: MetricTilesProps) {
  return (
    <RadioGroup
      aria-label="Chart metric"
      className="flex flex-wrap gap-2"
      onValueChange={(next) => {
        const picked = METRICS_IN_READING_ORDER.find((one) => one === next);

        if (picked !== undefined) {
          onMetricChange(picked);
        }
      }}
      value={metric}
    >
      {METRICS_IN_READING_ORDER.map((one) => (
        <MetricTile
          detail={faces[one].detail}
          key={one}
          label={METRIC_LABELS[one]}
          reading={faces[one].reading}
          value={one}
        />
      ))}
    </RadioGroup>
  );
}
