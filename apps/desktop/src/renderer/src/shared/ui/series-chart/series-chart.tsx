import { barY, defineChart, ruleX } from '@tanstack/charts';
import { scaleBand } from '@tanstack/charts-scales/band';
import { scaleLinear } from '@tanstack/charts-scales/linear';
import { decorative } from '@tanstack/charts/mark/decorative';
import { tooltip } from '@tanstack/charts/tooltip';
import { Chart } from '@tanstack/react-charts';
import { useId, useLayoutEffect, useMemo, useState } from 'react';

import { newestThatFit } from './newest-that-fit';

type ChartSeries = {
  /** The value each bar reads this series from. */
  key: string;
  /** The name the series answers to in legends and readings. */
  label: string;
  /** The series paint, one of the series tokens as a CSS reference. */
  fill: string;
  /** Whether the slice wears the hatch texture over its tint. */
  hatched?: boolean | undefined;
};

type ChartBar = {
  /** The bucket's opening instant, unique along the axis. */
  at: number;
  /** The printed name of the bucket. */
  label: string;
  /** The series readings, keyed by series. */
  values: Readonly<Record<string, number>>;
};

type SeriesChartProps = {
  /** The name assistive tech reads the chart by. */
  label: string;
  /** The stacked series in bottom-to-top order. */
  series: readonly ChartSeries[];
  /** The buckets in time order. */
  bars: readonly ChartBar[];
  /** The drawing's fixed height in pixels. */
  height?: number | undefined;
  /** The bucket whose slot marks where retained history begins. */
  edgeAt?: number | undefined;
};

type SeriesRow = {
  key: string;
  at: number;
  bucketLabel: string;
  seriesKey: string;
  value: number;
  paint: string;
  overlayPaint: string;
};

const HATCH_PITCH = 6;
const HATCH_ANGLE = 45;
const DEFAULT_HEIGHT = 160;

function useMeasuredWidth() {
  const [width, setWidth] = useState(0);
  const [watched, setWatched] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (watched === null) {
      return undefined;
    }

    const follow = new ResizeObserver(() => {
      setWidth(watched.clientWidth);
    });

    follow.observe(watched);

    return () => {
      follow.disconnect();
    };
  }, [watched]);

  return { inner: setWatched, width };
}

function seriesRows(
  bars: readonly ChartBar[],
  series: readonly ChartSeries[],
  hatchPaint: string,
): readonly SeriesRow[] {
  return bars.flatMap((bar) =>
    series.flatMap((one) => {
      const value = bar.values[one.key] ?? 0;

      if (value === 0) {
        return [];
      }

      return [
        {
          key: `${String(bar.at)}:${one.key}`,
          at: bar.at,
          bucketLabel: bar.label,
          seriesKey: one.key,
          value,
          paint: one.fill,
          overlayPaint: one.hatched === true ? hatchPaint : 'none',
        },
      ];
    }),
  );
}

function seriesMarks(rows: readonly SeriesRow[], edgeAt: number | undefined) {
  const stacked = barY(rows, {
    id: 'series',
    x: 'at',
    y: 'value',
    z: 'seriesKey',
    key: 'key',
    fill: (row) => row.paint,
  });
  const hatchOverlay = decorative(
    barY(rows, {
      id: 'series-hatch',
      x: 'at',
      y: 'value',
      z: 'seriesKey',
      fill: (row) => row.overlayPaint,
    }),
  );
  const retentionEdge =
    edgeAt === undefined
      ? []
      : [
          ruleX([edgeAt], {
            id: 'retention-edge',
            stroke: 'var(--color-line-selected)',
            strokeDasharray: '4 3',
          }),
        ];

  return [stacked, hatchOverlay, ...retentionEdge];
}

function hatchDefs(hatchId: string) {
  return (
    <svg aria-hidden className="absolute size-0">
      <defs>
        <pattern
          height={HATCH_PITCH}
          id={hatchId}
          patternTransform={`rotate(${String(HATCH_ANGLE)})`}
          patternUnits="userSpaceOnUse"
          width={HATCH_PITCH}
        >
          <line
            className="stroke-surface-card"
            style={{ strokeWidth: 'var(--hatch-stroke)' }}
            x1={0}
            x2={0}
            y1={0}
            y2={HATCH_PITCH}
          />
        </pattern>
      </defs>
    </svg>
  );
}

function bucketReading(points: readonly { datum: SeriesRow }[], series: readonly ChartSeries[]) {
  const labelBySeries = new Map(series.map((one) => [one.key, one.label]));
  const heading = points[0] === undefined ? '' : points[0].datum.bucketLabel;
  const lines = points.map(
    (point) =>
      `${labelBySeries.get(point.datum.seriesKey) ?? point.datum.seriesKey} ${point.datum.value.toLocaleString('en-US')}`,
  );

  return [heading, ...lines].join('\n');
}

function chartDefinitionOf(
  drawn: readonly ChartBar[],
  series: readonly ChartSeries[],
  hatchId: string,
  edgeAt: number | undefined,
) {
  const labels = new Map(drawn.map((bar) => [bar.at, bar.label]));
  const rows = seriesRows(drawn, series, `url(#${hatchId})`);
  const standingEdge = drawn.some((bar) => bar.at === edgeAt) ? edgeAt : undefined;

  return defineChart({
    focus: 'group-x',
    marks: seriesMarks(rows, standingEdge),
    x: {
      scale: () => scaleBand().padding(0.2),
      axis: { ticks: { format: (at) => labels.get(at) ?? String(at) } },
    },
    y: { scale: scaleLinear, nice: true },
    tooltip: {
      use: tooltip,
      formatGroup: (points) => bucketReading(points, series),
    },
  });
}

/**
 * Stacked bars over a band scale, named for assistive tech while the printed
 * readings stay beside it.
 *
 * @summary The caption and the table twin carry every figure as text, so losing the drawing loses
 * nothing a reader needs. A crowded axis drops the oldest buckets rather than thinning bars below
 * the minimum slot and says so in its description, a hatched series wears its texture over a
 * solid tint that carries the contrast duty alone, and resting on a bucket brings up its whole
 * reading.
 */
export function SeriesChart({
  label,
  series,
  bars,
  height = DEFAULT_HEIGHT,
  edgeAt,
}: SeriesChartProps) {
  const hatchId = `hatch-${useId().replaceAll(':', '')}`;
  const { inner, width } = useMeasuredWidth();
  const drawn = newestThatFit(bars, width);
  const definition = useMemo(
    () => chartDefinitionOf(drawn, series, hatchId, edgeAt),
    [drawn, series, edgeAt, hatchId],
  );
  const dropped = bars.length - drawn.length;

  return (
    <div className="w-full" ref={inner}>
      {hatchDefs(hatchId)}
      {width === 0 ? null : (
        <Chart
          ariaDescription={
            dropped === 0
              ? `Showing all ${String(drawn.length)} buckets.`
              : `Showing the newest ${String(drawn.length)} of ${String(bars.length)} buckets.`
          }
          ariaLabel={label}
          definition={definition}
          height={height}
        />
      )}
    </div>
  );
}

export type { ChartBar, ChartSeries };
