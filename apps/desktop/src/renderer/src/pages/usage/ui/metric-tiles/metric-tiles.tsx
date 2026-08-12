import type { MetricFaces } from '../../lib/usage-faces';
import type { UsageMetric } from '../../lib/usage-search';

import { MetricTile } from '../../../../shared/ui';

type MetricTilesProps = {
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
 * The five readings that headline the standing window.
 *
 * @summary The tiles read the window rather than choosing what the chart draws, so a figure and
 * the chart below it can move for different reasons without either claiming the other's meaning.
 * In a narrow window the row wraps rather than shrinking any face below reading size.
 */
export function MetricTiles({ faces }: MetricTilesProps) {
  return (
    <section aria-label="Window readings" className="flex flex-wrap gap-3">
      {METRICS_IN_READING_ORDER.map((one) => (
        <MetricTile
          detail={faces[one].detail}
          key={one}
          label={METRIC_LABELS[one]}
          reading={faces[one].reading}
        />
      ))}
    </section>
  );
}
