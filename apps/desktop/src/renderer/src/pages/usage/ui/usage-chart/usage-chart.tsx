import type { ChartBar, ChartSeries } from '../../../../shared/ui';
import type { DrawnChart } from '../../lib/usage-faces';

import { Disclosure, NumericCell, SeriesChart, TableShell } from '../../../../shared/ui';

type UsageChartProps = {
  /** The name assistive tech reads the chart and its twin by. */
  label: string;
  /** The selected tile's series and folded bars, drawn and printed alike. */
  drawn: DrawnChart;
  /** The printed sentence stating range, width, total, peak, and the UTC rule. */
  caption: string;
  /** The bucket whose slot marks where retained history begins. */
  edgeAt?: number | undefined;
  /** The twin's standing when the page owns it, so the menu tick can drive it. */
  tableOpen?: boolean | undefined;
  /** Receives the standing the trigger asks for. */
  onTableOpenChange?: ((open: boolean) => void) | undefined;
};

function twinRow(bar: ChartBar, series: readonly ChartSeries[]) {
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

/**
 * The series chart beside the printed readings that make it losable.
 *
 * @summary The caption states what the chart claims, and the folded data table prints every bucket
 * as text, so the conformance path never depends on the vector. The twin leaves the tree when
 * shut, keeping assistive tech out of a reading nobody asked for.
 */
export function UsageChart({
  label,
  drawn,
  caption,
  edgeAt,
  tableOpen,
  onTableOpenChange,
}: UsageChartProps) {
  const { series, bars } = drawn;

  return (
    <figure className="flex flex-col gap-2">
      <SeriesChart bars={bars} edgeAt={edgeAt} label={label} series={series} />
      <figcaption className="text-caption text-ink-secondary">{caption}</figcaption>
      <Disclosure label="Data table" onOpenChange={onTableOpenChange} open={tableOpen}>
        <TableShell caption={label}>
          <thead>
            <tr>
              <th className="px-2 py-1 text-start font-medium text-ink-secondary" scope="col">
                Bucket
              </th>
              {series.map((one) => (
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
          <tbody>{bars.map((bar) => twinRow(bar, series))}</tbody>
        </TableShell>
      </Disclosure>
    </figure>
  );
}
