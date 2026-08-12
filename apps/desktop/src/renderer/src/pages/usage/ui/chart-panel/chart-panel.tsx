import { Menu } from '@base-ui/react/menu';
import { useId } from 'react';

import type { DrawnChart } from '../../lib/usage-faces';
import type { ChartMeasure, StackDimension } from '../../lib/usage-search';

import {
  Disclosure,
  Icon,
  NumericCell,
  SegmentedControl,
  SeriesChart,
  TableShell,
} from '../../../../shared/ui';

type ChartPanelProps = {
  /** The measure the chart draws, which also names it. */
  measure: ChartMeasure;
  /** Receives the measure a person picked. */
  onMeasureChange: (measure: ChartMeasure) => void;
  /** The dimension the columns stack by. */
  stackedBy: StackDimension;
  /** Receives the dimension a person picked. */
  onStackedByChange: (stackedBy: StackDimension) => void;
  /** The drawn series, folded bars, and each series' window total. */
  drawn: DrawnChart;
  /** The sentence under the title, naming the width and what a column height means. */
  subCaption: string;
  /** The bucket whose slot marks where retained history begins. */
  edgeAt?: number | undefined;
  /** The twin's standing when the page owns it, so the menu tick can drive it. */
  tableOpen?: boolean | undefined;
  /** Receives the standing the trigger asks for. */
  onTableOpenChange?: ((open: boolean) => void) | undefined;
};

const MEASURE_OPTIONS = [
  { value: 'requests', label: 'Requests' },
  { value: 'tokens', label: 'Tokens' },
  { value: 'latency', label: 'Latency' },
  { value: 'spend', label: 'Spend' },
] as const satisfies readonly { value: ChartMeasure; label: string }[];

const MEASURE_TITLES: Readonly<Record<ChartMeasure, string>> = {
  requests: 'Requests over time',
  tokens: 'Tokens over time',
  latency: 'Latency over time',
  spend: 'Spend over time',
};

const STACK_LABELS: Readonly<Record<StackDimension, string>> = {
  gateway: 'Gateway',
  virtualModel: 'Virtual model',
  provider: 'Provider',
  account: 'Account',
};

const STACK_DIMENSIONS: readonly StackDimension[] = [
  'gateway',
  'virtualModel',
  'provider',
  'account',
];

const AVERAGES_NEVER_STACK = 'Latency averages, so it never stacks';

function legendItem(key: string, label: string, fill: string, total: number) {
  return (
    <li className="flex items-center gap-1.5" key={key}>
      <span aria-hidden className="size-2 rounded-chip" style={{ backgroundColor: fill }} />
      <span className="text-caption text-ink-secondary">{label}</span>
      <span className="font-mono text-mono-caption text-ink tabular-nums">
        {total.toLocaleString('en-US', { maximumFractionDigits: 2 })}
      </span>
    </li>
  );
}

function stackMenu(
  stackedBy: StackDimension,
  onStackedByChange: (next: StackDimension) => void,
  inertReason: string | undefined,
  reasonId: string,
) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-describedby={inertReason === undefined ? undefined : reasonId}
        aria-label={`Stacked by ${STACK_LABELS[stackedBy]}`}
        className="flex h-control items-center gap-1.5 rounded-control border border-line-subtle bg-surface-card px-2 text-detail focus-ring-wide aria-disabled:opacity-60"
        aria-disabled={inertReason === undefined ? undefined : true}
      >
        <span aria-hidden className="text-ink-secondary">
          Stacked by
        </span>
        <span aria-hidden className="font-medium text-ink">
          {STACK_LABELS[stackedBy]}
        </span>
        <Icon aria-hidden className="size-3 text-ink-secondary" name="chevron" />
        {inertReason === undefined ? null : (
          <span className="sr-only" id={reasonId}>
            {inertReason}
          </span>
        )}
      </Menu.Trigger>
      {inertReason === undefined ? (
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={4}>
            <Menu.Popup className="menu-surface">
              {STACK_DIMENSIONS.map((dimension) => (
                <Menu.Item
                  className="menu-action"
                  key={dimension}
                  onClick={() => {
                    onStackedByChange(dimension);
                  }}
                >
                  {STACK_LABELS[dimension]}
                </Menu.Item>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      ) : null}
    </Menu.Root>
  );
}

function twinRow(bar: DrawnChart['bars'][number], series: DrawnChart['series']) {
  return (
    <tr className="border-t border-line-faint" key={bar.at}>
      <td className="px-2 py-1 text-ink">{bar.label}</td>
      {series.map((one) => (
        <NumericCell key={one.key}>
          {(bar.values[one.key] ?? 0).toLocaleString('en-US')}
        </NumericCell>
      ))}
    </tr>
  );
}

type HeaderProps = {
  reasonId: string;
  title: string;
  subCaption: string;
  measure: ChartMeasure;
  onMeasureChange: (measure: ChartMeasure) => void;
  stackedBy: StackDimension;
  onStackedByChange: (stackedBy: StackDimension) => void;
};

function panelHeader(props: HeaderProps) {
  const stacks = props.measure !== 'latency' && props.measure !== 'spend';

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-card-title text-ink">{props.title}</h2>
        <p className="text-caption text-ink-secondary">{props.subCaption}</p>
      </div>
      <div className="flex items-center gap-2">
        {stackMenu(
          props.stackedBy,
          props.onStackedByChange,
          stacks ? undefined : AVERAGES_NEVER_STACK,
          props.reasonId,
        )}
        <SegmentedControl
          label="Chart measure"
          onChangeValue={props.onMeasureChange}
          options={MEASURE_OPTIONS}
          value={props.measure}
        />
      </div>
    </div>
  );
}

function tableTwin(title: string, drawn: DrawnChart) {
  return (
    <TableShell caption={title}>
      <thead>
        <tr>
          <th className="px-2 py-1 text-start font-medium text-ink-secondary" scope="col">
            Bucket
          </th>
          {drawn.series.map((one) => (
            <th
              className="px-2 py-1 text-end font-medium text-ink-secondary"
              key={one.key}
              scope="col"
            >
              {one.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{drawn.bars.map((bar) => twinRow(bar, drawn.series))}</tbody>
    </TableShell>
  );
}

/**
 * The window drawn over time, with the measure, the stack, and every series total beside it.
 *
 * @summary The legend prints each series' window total as text, and the folded table twin prints
 * every bucket, so losing the drawing loses nothing a reader needs. Latency averages rather than
 * adds, so the stack control stands unmovable with the reason named.
 */
export function ChartPanel({
  measure,
  onMeasureChange,
  stackedBy,
  onStackedByChange,
  drawn,
  subCaption,
  edgeAt,
  tableOpen,
  onTableOpenChange,
}: ChartPanelProps) {
  const title = MEASURE_TITLES[measure];
  const reasonId = `stack-reason-${useId().replaceAll(':', '')}`;

  return (
    <section
      aria-label={title}
      className="flex flex-col gap-2.5 rounded-card border border-line-subtle bg-surface-card p-3.5"
    >
      {panelHeader({
        reasonId,
        title,
        subCaption,
        measure,
        onMeasureChange,
        stackedBy,
        onStackedByChange,
      })}
      <ul className="flex flex-wrap items-center gap-3.5">
        {drawn.series.map((one) =>
          legendItem(one.key, one.label, one.fill, drawn.totals[one.key] ?? 0),
        )}
      </ul>
      <SeriesChart
        bars={drawn.bars}
        edgeAt={edgeAt}
        height={150}
        label={title}
        series={drawn.series}
      />
      <Disclosure label="Data table" onOpenChange={onTableOpenChange} open={tableOpen}>
        {tableTwin(title, drawn)}
      </Disclosure>
    </section>
  );
}
