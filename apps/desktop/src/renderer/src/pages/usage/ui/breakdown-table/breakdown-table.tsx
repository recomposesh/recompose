import type { ScopeLevel } from '../../lib/usage-search';

import { NumericCell, ProportionFill, SegmentedControl, TableShell } from '../../../../shared/ui';

export type BreakdownFace = {
  /** The level value the row stands for, absent where the traffic never reached the level. */
  key: string | undefined;
  /** The printed name the row answers to. */
  name: string;
  /** The printed request count. */
  requests: string;
  /** The printed token total. */
  tokens: string;
  /** The printed spend, absent off day width and for costless traffic. */
  spend?: string | undefined;
  /** The row's share of the window's requests, zero to one. */
  share: number;
  /** Whether the row can narrow the scope further. */
  drillable: boolean;
};

type BreakdownTableProps = {
  /** The hierarchy level the rows pivot on. */
  level: ScopeLevel;
  /** Receives the level a person picked. */
  onLevelChange: (level: ScopeLevel) => void;
  /** The pivoted rows, largest first, readings already printed. */
  rows: readonly BreakdownFace[];
  /** Receives the key of the row a person drilled into. */
  onDrill: (key: string) => void;
  /** Whether spend prints, which is only at day width. */
  spendColumn: boolean;
};

const LEVEL_OPTIONS = [
  { value: 'gateway', label: 'Gateway' },
  { value: 'virtualModel', label: 'Virtual model' },
  { value: 'providerModel', label: 'Model' },
  { value: 'provider', label: 'Provider' },
  { value: 'account', label: 'Account' },
] as const satisfies readonly { value: ScopeLevel; label: string }[];

const headCell = 'px-2 py-1 text-start font-medium text-ink-secondary';

function drillAct(face: BreakdownFace, onDrill: (key: string) => void) {
  if (!face.drillable || face.key === undefined) {
    return null;
  }

  const key = face.key;

  return (
    <button
      aria-label={`Drill into ${face.name}`}
      className="flex size-6 items-center justify-center rounded-control focus-ring text-ink-secondary row-hover"
      onClick={() => {
        onDrill(key);
      }}
      type="button"
    >
      <svg aria-hidden className="size-2.5" fill="currentColor" viewBox="0 0 10 10">
        <path d="M3 1.5 7.5 5 3 8.5Z" />
      </svg>
    </button>
  );
}

function breakdownRow(face: BreakdownFace, spendColumn: boolean, onDrill: (key: string) => void) {
  return (
    <tr className="border-t border-line-faint" key={face.key ?? face.name}>
      <td className="px-2 py-1 text-ink">{face.name}</td>
      <NumericCell>{face.requests}</NumericCell>
      <NumericCell>{face.tokens}</NumericCell>
      {spendColumn ? <NumericCell>{face.spend ?? ''}</NumericCell> : null}
      <td className="w-28 px-2 py-1">
        <ProportionFill label={`${face.name} share`} value={face.share} />
      </td>
      <td className="w-8 p-1">{drillAct(face, onDrill)}</td>
    </tr>
  );
}

/**
 * The group-by pivot over the same buckets every other reading folds from.
 *
 * @summary The control regroups rather than fetching again, so the pivot can never disagree with the
 * tiles or the chart. Every reading prints as text, the share meter is decoration over the printed
 * count, and a drillable row narrows the scope by one level.
 */
export function BreakdownTable({
  level,
  onLevelChange,
  rows,
  onDrill,
  spendColumn,
}: BreakdownTableProps) {
  return (
    <section aria-label="Breakdown" className="flex flex-col gap-3">
      <SegmentedControl
        label="Group by"
        onChangeValue={onLevelChange}
        options={LEVEL_OPTIONS}
        value={level}
      />
      <TableShell caption="Breakdown">
        <thead>
          <tr>
            <th className={headCell}>Name</th>
            <th className={`${headCell} text-end`}>Requests</th>
            <th className={`${headCell} text-end`}>Tokens</th>
            {spendColumn ? <th className={`${headCell} text-end`}>Spend</th> : null}
            <th className={headCell}>Share</th>
            <th className={headCell}>
              <span className="sr-only">Drill</span>
            </th>
          </tr>
        </thead>
        <tbody>{rows.map((face) => breakdownRow(face, spendColumn, onDrill))}</tbody>
      </TableShell>
    </section>
  );
}
