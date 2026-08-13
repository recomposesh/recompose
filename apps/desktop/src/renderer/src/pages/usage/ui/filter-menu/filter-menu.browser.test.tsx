import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { FilterMember } from './filter-menu';

import { FilterMenu } from './filter-menu';

const members: readonly FilterMember[] = [
  { key: 'claude-code', name: 'claude-code', requests: 6_120 },
  { key: 'cursor', name: 'cursor', requests: 3_240 },
  { key: 'api-playground', name: 'api-playground', requests: 2_100 },
  { key: 'raycast', name: 'raycast', requests: 1_020 },
];

function menu(over: Partial<Parameters<typeof FilterMenu>[0]> = {}) {
  const standing: readonly string[] = [];
  const props = {
    label: 'Gateways',
    members,
    onSelectedChange: () => {},
    searchLabel: 'Search gateways',
    selected: standing,
    ...over,
  };

  return (
    <FilterMenu
      label={props.label}
      members={props.members}
      onSelectedChange={props.onSelectedChange}
      searchLabel={props.searchLabel}
      selected={props.selected}
    />
  );
}

test('a filter standing on everything reads All rather than a count', async () => {
  const screen = await render(menu());

  await expect.element(screen.getByRole('button', { name: 'Gateways All' })).toBeVisible();
});

test('a standing filter reads how many of the members it keeps', async () => {
  const screen = await render(menu({ selected: ['claude-code', 'cursor'] }));

  await expect.element(screen.getByRole('button', { name: 'Gateways 2 of 4' })).toBeVisible();
});

test('the menu lists every member with the requests it served', async () => {
  const screen = await render(menu());

  await screen.getByRole('button', { name: 'Gateways All' }).click();

  await expect.element(screen.getByRole('checkbox', { name: 'claude-code' })).toBeVisible();
  await expect.element(screen.getByText('6,120')).toBeVisible();
});

test('checking a member narrows the filter onto it', async () => {
  const onSelectedChange = vi.fn<(next: readonly string[]) => void>();
  const screen = await render(menu({ onSelectedChange }));

  await screen.getByRole('button', { name: 'Gateways All' }).click();
  await screen.getByRole('checkbox', { name: 'cursor' }).click();

  expect(onSelectedChange).toHaveBeenCalledWith(['cursor']);
});

test('unchecking the last standing member stands the filter back on everything', async () => {
  const onSelectedChange = vi.fn<(next: readonly string[]) => void>();
  const screen = await render(menu({ selected: ['cursor'], onSelectedChange }));

  await screen.getByRole('button', { name: 'Gateways 1 of 4' }).click();
  await screen.getByRole('checkbox', { name: 'cursor' }).click();

  expect(onSelectedChange).toHaveBeenCalledWith([]);
});

test('the search field narrows the list to the members it names', async () => {
  const screen = await render(menu());

  await screen.getByRole('button', { name: 'Gateways All' }).click();
  await screen.getByRole('searchbox', { name: 'Search gateways' }).fill('cur');

  await expect.element(screen.getByRole('checkbox', { name: 'cursor' })).toBeVisible();
  await expect.element(screen.getByRole('checkbox', { name: 'raycast' })).not.toBeInTheDocument();
});

test('select all stands the filter back on everything', async () => {
  const onSelectedChange = vi.fn<(next: readonly string[]) => void>();
  const screen = await render(menu({ selected: ['cursor'], onSelectedChange }));

  await screen.getByRole('button', { name: 'Gateways 1 of 4' }).click();
  await screen.getByRole('button', { name: 'Select all' }).click();

  expect(onSelectedChange).toHaveBeenCalledWith([]);
});

test('a search that matches nothing says so rather than leaving a gap', async () => {
  const screen = await render(menu());

  await screen.getByRole('button', { name: 'Gateways All' }).click();
  await screen.getByRole('searchbox', { name: 'Search gateways' }).fill('nothing by that name');

  await expect.element(screen.getByText('No gateways by that name')).toBeVisible();
});

test('a window that served nobody names the quiet rather than blaming the search', async () => {
  const screen = await render(menu({ members: [] }));

  await screen.getByRole('button', { name: 'Gateways All' }).click();

  await expect.element(screen.getByText('No gateways in this window')).toBeVisible();
  await expect.element(screen.getByText('All 0 selected')).not.toBeInTheDocument();
});

test('a selection standing over a quiet window still counts itself', async () => {
  const screen = await render(menu({ members: [], selected: ['cursor'] }));

  await expect.element(screen.getByRole('button', { name: 'Gateways 1 of 1' })).toBeVisible();
});

test('the footer counts what the filter keeps against what it could keep', async () => {
  const screen = await render(menu({ selected: ['cursor', 'raycast'] }));

  await screen.getByRole('button', { name: 'Gateways 2 of 4' }).click();

  await expect.element(screen.getByText('2 of 4 selected')).toBeVisible();
});
