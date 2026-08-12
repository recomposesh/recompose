import { ProportionFill, SegmentedControl } from '../../../../shared/ui';

export type PanelUnit = 'requests' | 'tokens';

export type PanelRow = {
  /** The member the row stands for, absent where the traffic never reached the dimension. */
  key: string | undefined;
  /** The name a person knows the member by. */
  name: string;
  /** The printed request count. */
  requests: string;
  /** The printed token total. */
  tokens: string;
  /** The row's share of the panel's own total, zero to one. */
  share: number;
};

type BreakdownPanelProps = {
  /** What the panel folds by, which is also its heading. */
  title: string;
  /** The folded rows, largest first, readings already printed. */
  rows: readonly PanelRow[];
  /** The unit the values print in. */
  unit: PanelUnit;
  /** Receives the unit a person picked. */
  onUnitChange: (unit: PanelUnit) => void;
};

const UNIT_OPTIONS = [
  { value: 'requests', label: 'Reqs' },
  { value: 'tokens', label: 'Tokens' },
] as const satisfies readonly { value: PanelUnit; label: string }[];

function panelRow(row: PanelRow, unit: PanelUnit) {
  return (
    <li className="flex items-center gap-2.5" key={row.key ?? row.name}>
      <span className="w-30 truncate text-detail text-ink">{row.name}</span>
      <span className="min-w-16 flex-1">
        <ProportionFill label={`${row.name} share`} value={row.share} />
      </span>
      <span className="w-14 shrink-0 text-end font-mono text-mono-value text-ink tabular-nums">
        {unit === 'requests' ? row.requests : row.tokens}
      </span>
    </li>
  );
}

/**
 * One dimension folded out of the standing window, as rows of name, share, and figure.
 *
 * @summary Every panel folds the same buckets the tiles and the chart read, so no two panels of
 * one window can disagree. The share meter is decoration over a printed figure, and the unit
 * control reprints the same fold rather than fetching another one.
 */
export function BreakdownPanel({ title, rows, unit, onUnitChange }: BreakdownPanelProps) {
  return (
    <section
      aria-label={title}
      className="flex min-w-0 flex-1 flex-col gap-3 rounded-card border border-line-subtle bg-surface-card p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-card-title text-ink">{title}</h2>
        <SegmentedControl
          label={`${title} unit`}
          onChangeValue={onUnitChange}
          options={UNIT_OPTIONS}
          value={unit}
        />
      </div>
      <ul className="flex flex-col gap-2.5">{rows.map((row) => panelRow(row, unit))}</ul>
    </section>
  );
}
