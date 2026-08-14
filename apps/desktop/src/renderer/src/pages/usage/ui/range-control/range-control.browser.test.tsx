import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import type { UsageSearch } from '../../lib/usage-search';

import { RangeControl } from './range-control';

const NOW = new Date(2026, 7, 12, 12, 0, 0).getTime();
const DAY = 86_400_000;

function viewing(over: Partial<UsageSearch> = {}): UsageSearch {
  return { range: '24h', metric: 'requests', stackedBy: 'gateway', ...over };
}

function control(over: Partial<Parameters<typeof RangeControl>[0]> = {}) {
  const props = {
    now: NOW,
    onSearchChange: () => {},
    retentionDays: 30,
    search: viewing(),
    ...over,
  };

  return (
    <RangeControl
      now={props.now}
      onSearchChange={props.onSearchChange}
      retentionDays={props.retentionDays}
      search={props.search}
    />
  );
}

function landedDays(onSearchChange: ReturnType<typeof vi.fn<(next: UsageSearch) => void>>) {
  const landed = onSearchChange.mock.calls[0]?.[0];

  if (landed === undefined) {
    throw new Error('no window landed on the screen');
  }

  return {
    range: landed.range,
    from: new Date(landed.from ?? 0).getDate(),
    to: new Date(landed.to ?? 0).getDate(),
  };
}

test('the presets stand as one choice, the standing one checked', async () => {
  const screen = await render(control());

  await expect.element(screen.getByRole('radio', { name: '24h' })).toBeChecked();
});

test('picking a preset moves the window and drops any custom edges', async () => {
  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await render(
    control({ search: viewing({ range: 'custom', from: NOW - DAY, to: NOW }), onSearchChange }),
  );

  await screen.getByRole('radio', { name: '7d' }).click();

  expect(onSearchChange).toHaveBeenCalledWith({
    range: '7d',
    metric: 'requests',
    stackedBy: 'gateway',
  });
});

test('a range wider than retention stays reachable but unmovable, with the reason named', async () => {
  const screen = await render(control({ retentionDays: 7 }));

  await expect
    .element(screen.getByRole('radio', { name: '30d' }))
    .toHaveAttribute('aria-disabled', 'true');
  await expect.element(screen.getByText('Usage retention holds 7 days')).toBeInTheDocument();
});

test('the custom window is drawn on a calendar and lands only once applied', async () => {
  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await render(control({ onSearchChange }));

  await screen.getByRole('button', { name: 'Custom' }).click();
  await screen.getByRole('button', { name: /August 5/ }).click();
  await screen.getByRole('button', { name: /August 7/ }).click();

  expect(onSearchChange).not.toHaveBeenCalled();

  await screen.getByRole('button', { name: 'Apply' }).click();

  expect(landedDays(onSearchChange)).toEqual({ range: 'custom', from: 5, to: 7 });
});

test('the first day pressed starts a window rather than widening the standing one', async () => {
  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await render(
    control({ search: viewing({ range: 'custom', from: NOW - DAY, to: NOW }), onSearchChange }),
  );

  await screen.getByRole('button', { name: 'Custom' }).click();
  await screen.getByRole('button', { name: /August 20/ }).click();
  await screen.getByRole('button', { name: /August 25/ }).click();
  await screen.getByRole('button', { name: 'Apply' }).click();

  expect(landedDays(onSearchChange)).toEqual({ range: 'custom', from: 20, to: 25 });
});

test('a day pressed inside the standing window paints a new window rather than widening it', async () => {
  const screen = await render(
    control({ search: viewing({ range: 'custom', from: NOW - DAY, to: NOW }) }),
  );

  await screen.getByRole('button', { name: 'Custom' }).click();
  await screen.getByRole('button', { name: /August 20/ }).click();

  await expect
    .element(screen.getByRole('button', { name: /August 20th, 2026, selected/ }))
    .toBeVisible();
  await expect
    .element(screen.getByRole('button', { name: /August 11th, 2026, selected/ }))
    .not.toBeInTheDocument();
});

test('a day pressed behind the opening edge reopens the window there', async () => {
  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await render(control({ onSearchChange }));

  await screen.getByRole('button', { name: 'Custom' }).click();
  await screen.getByRole('button', { name: /August 20/ }).click();
  await screen.getByRole('button', { name: /August 17/ }).click();
  await screen.getByRole('button', { name: 'Apply' }).click();

  expect(landedDays(onSearchChange)).toEqual({ range: 'custom', from: 17, to: 20 });
});

test('cancelling leaves the standing window alone', async () => {
  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await render(control({ onSearchChange }));

  await screen.getByRole('button', { name: 'Custom' }).click();
  await screen.getByRole('button', { name: /August 5/ }).click();
  await screen.getByRole('button', { name: 'Cancel' }).click();

  expect(onSearchChange).not.toHaveBeenCalled();
});

test('a preset is drawn into the window and lands only once applied', async () => {
  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await render(control({ onSearchChange }));

  await screen.getByRole('button', { name: 'Custom' }).click();
  await screen.getByRole('button', { name: 'This month' }).click();

  expect(onSearchChange).not.toHaveBeenCalled();

  await screen.getByRole('button', { name: 'Apply' }).click();

  expect(onSearchChange).toHaveBeenCalledWith({
    range: 'this-month',
    metric: 'requests',
    stackedBy: 'gateway',
  });
});

test('the calendar paints the window a preset drew, dropping the one it opened on', async () => {
  const screen = await render(control({ search: viewing({ range: 'this-month' }) }));

  await screen.getByRole('button', { name: 'Custom' }).click();
  await screen.getByRole('button', { name: 'Last 7 days' }).click();

  await expect
    .element(screen.getByRole('button', { name: /August 5th, 2026, selected/ }))
    .toBeVisible();
  await expect
    .element(screen.getByRole('button', { name: /August 1st, 2026, selected/ }))
    .not.toBeInTheDocument();
});

test('the preset the standing window came from reads as the picked one', async () => {
  const screen = await render(control({ search: viewing({ range: 'this-month' }) }));

  await screen.getByRole('button', { name: 'Custom' }).click();

  await expect
    .element(screen.getByRole('button', { name: 'This month' }))
    .toHaveAttribute('aria-current', 'true');
  await expect.element(screen.getByText('Custom range')).not.toHaveAttribute('aria-current');
});

test('a preset reaching back from now reads as the picked one too', async () => {
  const screen = await render(control({ search: viewing({ range: '24h' }) }));

  await screen.getByRole('button', { name: 'Custom' }).click();

  await expect
    .element(screen.getByRole('button', { name: 'Last 24 hours' }))
    .toHaveAttribute('aria-current', 'true');
});

test('drawing a day leaves the preset behind and reads as a custom range', async () => {
  const screen = await render(control({ search: viewing({ range: '24h' }) }));

  await screen.getByRole('button', { name: 'Custom' }).click();
  await screen.getByRole('button', { name: /August 5/ }).click();

  await expect.element(screen.getByText('Custom range')).toHaveAttribute('aria-current', 'true');
  await expect
    .element(screen.getByRole('button', { name: 'Last 24 hours' }))
    .not.toHaveAttribute('aria-current');
});

test('a preset pressed by mistake is left behind by cancelling', async () => {
  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await render(control({ onSearchChange }));

  await screen.getByRole('button', { name: 'Custom' }).click();
  await screen.getByRole('button', { name: 'This week' }).click();
  await screen.getByRole('button', { name: 'Cancel' }).click();

  expect(onSearchChange).not.toHaveBeenCalled();
});

test('the window names the zone its edges are read in', async () => {
  const screen = await render(control());

  await screen.getByRole('button', { name: 'Custom' }).click();

  await expect.element(screen.getByLabelText('Window opens at')).toBeVisible();
  await expect.element(screen.getByLabelText('Window closes at')).toBeVisible();
});

test('walking the calendar to another month draws the window there', async () => {
  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await render(control({ onSearchChange }));

  await screen.getByRole('button', { name: 'Custom' }).click();
  await screen.getByRole('button', { name: 'Previous month' }).click();
  await screen.getByRole('button', { name: /July 6/ }).click();
  await screen.getByRole('button', { name: 'Apply' }).click();

  const drawn = onSearchChange.mock.calls[0]?.[0];

  expect(new Date(drawn?.from ?? 0).getMonth()).toBe(6);
});

test('walking the calendar forward draws the window in the month after it', async () => {
  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await render(control({ onSearchChange }));

  await screen.getByRole('button', { name: 'Custom' }).click();
  await screen.getByRole('button', { name: 'Next month' }).click();
  await screen.getByRole('button', { name: /September 8/ }).click();
  await screen.getByRole('button', { name: 'Apply' }).click();

  const drawn = onSearchChange.mock.calls[0]?.[0];

  expect(new Date(drawn?.to ?? 0).getMonth()).toBe(8);
});

test('walking a day off the edge of a month draws the month it lands in', async () => {
  const screen = await render(control());

  await screen.getByRole('button', { name: 'Custom' }).click();
  await screen.getByRole('button', { name: /August 1st/ }).click();
  await userEvent.keyboard('{ArrowLeft}');

  await expect.element(screen.getByText('July 2026')).toBeVisible();
});

test('the clock beside an edge moves that edge to the hour it names', async () => {
  const onSearchChange = vi.fn<(next: UsageSearch) => void>();
  const screen = await render(control({ onSearchChange }));

  await screen.getByRole('button', { name: 'Custom' }).click();
  await screen.getByLabelText('Window opens at').fill('08:30');
  await screen.getByRole('button', { name: 'Apply' }).click();

  const drawn = onSearchChange.mock.calls[0]?.[0];
  const opened = new Date(drawn?.from ?? 0);

  expect([opened.getHours(), opened.getMinutes()]).toEqual([8, 30]);
});
