import { Radio } from '@base-ui/react/radio';

type MetricTileProps = {
  /** Value committed when this tile wins the group. */
  value: string;
  /** The metric the tile stands for. */
  label: string;
  /** The headline figure, already printed. */
  reading: string;
  /** A qualifying line under the figure, when the metric carries one. */
  detail?: string | undefined;
};

/**
 * A stat card that doubles as the choice of what the chart draws.
 *
 * @summary Reach for it inside a radio group where each headline figure also selects a view, the
 * way the usage tiles pick the chart's series. The face carries the metric's name, its figure,
 * and one qualifying line, and the checked frame names the standing choice.
 */
export function MetricTile({ value, label, reading, detail }: MetricTileProps) {
  return (
    <Radio.Root
      className="flex min-w-28 flex-col items-start gap-0.5 rounded-card border border-line-subtle bg-surface-card p-3 text-start focus-ring-wide data-checked:border-line-selected"
      value={value}
    >
      <span className="text-detail text-ink-secondary">{label}</span>
      <span className="font-mono text-invitation text-ink tabular-nums">{reading}</span>
      {detail === undefined ? null : (
        <span className="text-detail text-ink-secondary">{detail}</span>
      )}
    </Radio.Root>
  );
}
