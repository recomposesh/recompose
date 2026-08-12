import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { DrawnChart } from '../../lib/usage-faces';
import type { ChartMeasure, StackDimension } from '../../lib/usage-search';

import { ChartPanel } from './chart-panel';

const HOUR = 3_600_000;
const NOON = 1_754_956_800_000;

const drawn: DrawnChart = {
  series: [
    { key: 'claude-code', label: 'claude-code', fill: 'var(--color-series-slot-1)' },
    { key: 'cursor', label: 'cursor', fill: 'var(--color-series-slot-2)' },
  ],
  bars: [
    { at: NOON, label: '12:00', values: { 'claude-code': 120, cursor: 60 } },
    { at: NOON + HOUR, label: '13:00', values: { 'claude-code': 90, cursor: 30 } },
  ],
  totals: { 'claude-code': 210, cursor: 90 },
};

function panel(over: Partial<Parameters<typeof ChartPanel>[0]> = {}) {
  const props = {
    drawn,
    measure: 'requests' as const,
    onMeasureChange: () => {},
    onStackedByChange: () => {},
    stackedBy: 'gateway' as const,
    subCaption: 'hour buckets · the column height is the window total',
    ...over,
  };

  return (
    <ChartPanel
      drawn={props.drawn}
      measure={props.measure}
      onMeasureChange={props.onMeasureChange}
      onStackedByChange={props.onStackedByChange}
      onTableOpenChange={props.onTableOpenChange}
      stackedBy={props.stackedBy}
      subCaption={props.subCaption}
      tableOpen={props.tableOpen}
    />
  );
}

test('the panel names the measure it draws and how it folded the window', async () => {
  const screen = await render(panel());

  await expect.element(screen.getByRole('region', { name: 'Requests over time' })).toBeVisible();
  await expect
    .element(screen.getByText('hour buckets · the column height is the window total'))
    .toBeVisible();
});

test('the legend prints every series total as text beside its paint', async () => {
  const screen = await render(panel());

  await expect.element(screen.getByText('claude-code')).toBeVisible();
  await expect.element(screen.getByText('210')).toBeVisible();
});

test('picking a measure hands it back', async () => {
  const onMeasureChange = vi.fn<(measure: ChartMeasure) => void>();
  const screen = await render(panel({ onMeasureChange }));

  await screen.getByRole('radio', { name: 'Tokens' }).click();

  expect(onMeasureChange).toHaveBeenCalledWith('tokens');
});

test('picking a stack dimension hands it back', async () => {
  const onStackedByChange = vi.fn<(stackedBy: StackDimension) => void>();
  const screen = await render(panel({ onStackedByChange }));

  await screen.getByRole('button', { name: 'Stacked by Gateway' }).click();
  await screen.getByRole('menuitem', { name: 'Provider' }).click();

  expect(onStackedByChange).toHaveBeenCalledWith('provider');
});

test('an averaging measure leaves the stack control unmovable rather than lying about it', async () => {
  const screen = await render(panel({ measure: 'latency' }));

  await expect
    .element(screen.getByRole('button', { name: 'Stacked by Gateway' }))
    .toHaveAttribute('aria-disabled', 'true');
});

test('the table twin prints every bucket of every series as text', async () => {
  const screen = await render(panel({ tableOpen: true }));

  await expect.element(screen.getByRole('table', { name: 'Requests over time' })).toBeVisible();
  await expect.element(screen.getByRole('cell', { name: '12:00' })).toBeVisible();
  await expect.element(screen.getByRole('cell', { name: '120' })).toBeVisible();
});
