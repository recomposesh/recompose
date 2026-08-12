type MetricTileProps = {
  /** The metric the tile stands for. */
  label: string;
  /** The headline figure, already printed. */
  reading: string;
  /** A qualifying line under the figure, when the metric carries one. */
  detail?: string | undefined;
};

/**
 * One stat card: what the figure counts, the figure, and the line qualifying it.
 *
 * @summary Reach for it in a row of readings that headline a window. The tile reads rather than
 * acts, so the choice of what a chart draws lives on the chart's own control instead.
 */
export function MetricTile({ label, reading, detail }: MetricTileProps) {
  return (
    <div
      aria-label={label}
      className="flex min-w-28 flex-1 flex-col items-start gap-1 rounded-card border border-line-subtle bg-surface-card px-3.5 py-3"
      role="group"
    >
      <span className="text-caption text-ink-secondary">{label}</span>
      <span className="font-mono text-mono-figure text-ink tabular-nums">{reading}</span>
      {detail === undefined ? null : (
        <span className="text-caption text-ink-secondary">{detail}</span>
      )}
    </div>
  );
}
