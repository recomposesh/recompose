import { expect, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import type { ChartBar, ChartSeries } from '../index';

import { tokenChartSeries } from '../../testing';
import { SeriesChart } from '../index';

const inputSeries: ChartSeries = {
  key: 'input',
  label: 'Input',
  fill: 'var(--color-series-input)',
};

const tokenSeries = tokenChartSeries;

const tokenBars: readonly ChartBar[] = [
  { at: 0, label: '09:00', values: { input: 30, cached: 20, output: 10 } },
  { at: 1, label: '10:00', values: { input: 12, cached: 4, output: 6 } },
  { at: 2, label: '11:00', values: { input: 40, cached: 25, output: 15 } },
  { at: 3, label: '12:00', values: { input: 8, cached: 2, output: 3 } },
];

const spendSeries: readonly ChartSeries[] = [
  { key: 'billed', label: 'Billed', fill: 'var(--color-series-cost)' },
  {
    key: 'equivalent',
    label: 'Equivalent',
    fill: 'var(--color-series-cost-equivalent)',
    hatched: true,
  },
];

const crowdedBars: readonly ChartBar[] = Array.from({ length: 100 }, (_, hour) => ({
  at: hour,
  label: `${String(hour)}:00`,
  values: { input: 5 + (hour % 7) },
}));

const paintedWith = (canvasElement: HTMLElement, paint: string) =>
  [...canvasElement.querySelectorAll('rect')].filter(
    (slice) => slice.getAttribute('fill') === paint,
  );

const meta = preview.meta({
  component: SeriesChart,
  args: { label: 'Tokens over the last day', series: tokenSeries, bars: tokenBars },
  decorators: [
    (Story) => (
      <div style={{ width: 480 }}>
        <Story />
      </div>
    ),
  ],
});

/** The chart is a named image, and every series paints one slice per bucket in its own token. */
export const StackedBuckets = meta.story({
  play: async ({ canvas, canvasElement }) => {
    const chart = await canvas.findByRole('img', { name: 'Tokens over the last day' });

    await expect(chart).toBeVisible();
    await expect(chart.querySelector('desc')).toHaveTextContent('Showing all 4 buckets.');

    await waitFor(async () => {
      await expect(paintedWith(canvasElement, 'var(--color-series-input)')).toHaveLength(4);
    });

    await expect(paintedWith(canvasElement, 'var(--color-series-cached)')).toHaveLength(4);
    await expect(paintedWith(canvasElement, 'var(--color-series-output)')).toHaveLength(4);
  },
});

/** A hatched series wears its texture over the solid tint that carries the contrast duty. */
export const AHatchedSeries = meta.story({
  args: {
    label: 'Spend by day',
    series: spendSeries,
    bars: [
      { at: 0, label: 'Mon', values: { billed: 120, equivalent: 340 } },
      { at: 1, label: 'Tue', values: { billed: 80, equivalent: 410 } },
    ],
  },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      const hatched = [...canvasElement.querySelectorAll('rect')].filter((slice) =>
        (slice.getAttribute('fill') ?? '').startsWith('url(#'),
      );

      await expect(hatched).toHaveLength(2);
    });
  },
});

/** A crowded axis drops the oldest buckets instead of thinning bars, and says so. */
export const ACrowdedRange = meta.story({
  args: { label: 'Requests over 100 hours', series: [inputSeries], bars: crowdedBars },
  decorators: [
    (Story) => (
      <div style={{ width: 200 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas, canvasElement }) => {
    const chart = await canvas.findByRole('img', { name: 'Requests over 100 hours' });

    await waitFor(async () => {
      await expect(chart.querySelector('desc')).toHaveTextContent(/newest \d+ of 100 buckets/);
    });

    await expect(paintedWith(canvasElement, 'var(--color-series-input)').length).toBeLessThan(100);
  },
});

/** The retention edge draws as a dashed rule at the oldest retained bucket's slot. */
export const ARetentionEdge = meta.story({
  args: { edgeAt: 2 },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(canvasElement.querySelector('[stroke-dasharray]')).toBeInTheDocument();
    });
  },
});

/** Resting on a bucket brings up its whole reading, every series printed by name. */
export const TheBucketReading = meta.story({
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(canvasElement.querySelectorAll('rect').length).toBeGreaterThan(0);
    });

    const [slice] = canvasElement.querySelectorAll('rect');

    if (slice === undefined) {
      throw new Error('the chart drew no slice to rest on');
    }

    const box = slice.getBoundingClientRect();

    slice.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: box.x + box.width / 2,
        clientY: box.y + box.height / 2,
      }),
    );

    await waitFor(async () => {
      await expect(document.body).toHaveTextContent('09:00');
      await expect(document.body).toHaveTextContent(/Input/);
      await expect(document.body).toHaveTextContent(/30/);
      await expect(document.body).toHaveTextContent(/Cached/);
    });
  },
});
