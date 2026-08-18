import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import type { DrawnChart } from '../../lib/usage-faces';

import { seriesTotals } from '../../lib/usage-chart-fold';
import { ChartPanel } from './chart-panel';

const HOUR = 3_600_000;
const OPENING = 1_754_956_800_000;

const series = [
  { key: 'claude-code', label: 'claude-code', fill: 'var(--color-series-slot-1)' },
  { key: 'cursor', label: 'cursor', fill: 'var(--color-series-slot-2)' },
  { key: 'api-playground', label: 'api-playground', fill: 'var(--color-series-slot-3)' },
];

const hourlyBars: DrawnChart['bars'] = Array.from({ length: 12 }, (_unused, hour) => ({
  at: OPENING + hour * HOUR,
  label: `${String(hour).padStart(2, '0')}:00`,
  values: {
    'claude-code': 120 + ((hour * 37) % 90),
    cursor: 60 + ((hour * 17) % 40),
    'api-playground': 30 + ((hour * 11) % 25),
  },
}));

const drawn: DrawnChart = { series, bars: hourlyBars, totals: seriesTotals(hourlyBars) };

const averagedBars: DrawnChart['bars'] = hourlyBars.map((bar) => ({
  ...bar,
  values: { latency: 480 + (bar.at % 300) },
}));

const meta = preview.meta({
  component: ChartPanel,
  args: {
    drawn,
    measure: 'requests' as const,
    onMeasureChange: () => {},
    onStackedByChange: () => {},
    stackedBy: 'gateway' as const,
    subCaption: 'hour buckets · the column height is the window total',
  },
});

/** The window over time, stacked by gateway, every series total printed in the legend. */
export const StackedByGateway = meta.story({
  play: async ({ canvas }) => {
    const total = drawn.totals['claude-code'] ?? 0;

    await expect(await canvas.findByText(total.toLocaleString('en-US'))).toBeVisible();
  },
});

/** Latency averages rather than adds, so the stack control stands unmovable. */
export const AveragedLatency = meta.story({
  args: {
    measure: 'latency' as const,
    drawn: {
      series: [{ key: 'latency', label: 'Average latency', fill: 'var(--color-series-input)' }],
      bars: averagedBars,
      totals: seriesTotals(averagedBars),
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /Stacked by/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  },
});

/** The table twin prints every bucket of every series as text. */
export const TableTwinOpen = meta.story({
  args: { tableOpen: true },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('table', { name: 'Requests over time' })).toBeVisible();
  },
});

/** Picking the stack dimension moves the whole drawing onto it. */
export const PickingTheStack = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Stacked by Gateway' }));
  },
});

/**
 * The panel against the column a small window leaves it, whose header wraps instead of clipping.
 *
 * @summary The stack menu and the measure control step under the title once the row cannot hold
 * them beside it, so every control stays whole and pressable at the narrowest column the window
 * minimum leaves the page.
 */
export const HeaderWrapsWhenNarrow = meta.story({
  decorators: [
    (Story) => (
      <div className="w-84">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const section = await canvas.findByRole('region', { name: 'Requests over time' });
    const measure = await canvas.findByRole('radiogroup', { name: 'Chart measure' });
    const title = await canvas.findByText('Requests over time');

    await expect(section.scrollWidth).toBeLessThanOrEqual(section.clientWidth);
    await expect(measure.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      title.getBoundingClientRect().bottom,
    );
    await expect(measure.getBoundingClientRect().right).toBeLessThanOrEqual(
      section.getBoundingClientRect().right,
    );
  },
});
