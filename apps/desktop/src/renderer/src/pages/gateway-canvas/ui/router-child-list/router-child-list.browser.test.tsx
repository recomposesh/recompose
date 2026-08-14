import { useState } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import type { RouterMode } from '../../lib/routing-edits';
import type { RouterChild } from './router-child-list';

import { RouterChildList } from './router-child-list';

const three: readonly RouterChild[] = [
  { routeNodeId: 'n1', name: 'Work key', detail: 'gpt-5' },
  { routeNodeId: 'n2', name: 'Claude Max', detail: 'claude-opus-5' },
  { routeNodeId: 'n3', name: 'Ollama', detail: 'qwen3' },
];

function moved(rows: readonly RouterChild[], from: number, to: number): RouterChild[] {
  const held = rows[from];

  if (held === undefined) {
    return [...rows];
  }

  const without = rows.filter((_, rank) => rank !== from);

  return [...without.slice(0, to), held, ...without.slice(to)];
}

function Ladder({ mode = 'failover' }: { mode?: RouterMode }) {
  const [rows, setRows] = useState<readonly RouterChild[]>(three);

  return (
    <RouterChildList
      mode={mode}
      onMove={(from, to) => {
        setRows(moved(rows, from, to));
      }}
      rows={rows}
    />
  );
}

function rankColumn(container: HTMLElement): (string | null)[] {
  return [...container.querySelectorAll('[data-rank]')].map((cell) => cell.textContent);
}

test('a failover ladder prints a rank on every row, so the order reads without counting', async () => {
  const screen = await render(<Ladder />);

  await expect.element(screen.getByRole('list', { name: 'Children' })).toBeVisible();
  expect(rankColumn(screen.container)).toEqual(['1', '2', '3']);
});

test('a round-robin child list carries no rank, because no end of it wins', async () => {
  const screen = await render(<Ladder mode="round-robin" />);

  await expect.element(screen.getByText('Ollama')).toBeVisible();
  expect(rankColumn(screen.container)).toEqual([]);
});

test('the keyboard alone moves the third child up one rank', async () => {
  const screen = await render(<Ladder />);

  await userEvent.click(screen.getByRole('button', { name: 'Move Ollama up' }));

  expect(
    [...screen.container.querySelectorAll('[data-child-name]')].map((cell) => cell.textContent),
  ).toEqual(['Work key', 'Ollama', 'Claude Max']);
});

test('the live region announces the rank the moved row landed on', async () => {
  const screen = await render(<Ladder />);

  await userEvent.click(screen.getByRole('button', { name: 'Move Ollama up' }));

  await expect.element(screen.getByRole('status')).toHaveTextContent('second of three');
});

test('the moved row keeps focus on its own control, so the next press moves the same child', async () => {
  const screen = await render(<Ladder />);

  await userEvent.click(screen.getByRole('button', { name: 'Move Ollama up' }));

  await expect.element(screen.getByRole('button', { name: 'Move Ollama up' })).toHaveFocus();
});

test('the topmost row offers no move up, and says so without leaving the tab order', async () => {
  const screen = await render(<Ladder />);
  const topmost = screen.getByRole('button', { name: 'Move Work key up' });

  await expect.element(topmost).toHaveAttribute('aria-disabled', 'true');
  await expect
    .element(screen.getByRole('button', { name: 'Move Ollama down' }))
    .toHaveAttribute('aria-disabled', 'true');

  const held = topmost.element();

  if (held instanceof HTMLButtonElement) {
    held.focus();
  }

  await expect.element(topmost).toHaveFocus();
});

test('a move the ladder cannot make changes nothing and says nothing', async () => {
  const screen = await render(<Ladder />);

  screen
    .getByRole('button', { name: 'Move Work key up' })
    .element()
    .dispatchEvent(new MouseEvent('click', { bubbles: true }));

  expect(
    [...screen.container.querySelectorAll('[data-child-name]')].map((cell) => cell.textContent),
  ).toEqual(['Work key', 'Claude Max', 'Ollama']);
  await expect.element(screen.getByRole('status')).toHaveTextContent('');
});

test('a row that landed at the top keeps focus on the very control that moved it', async () => {
  const screen = await render(<Ladder />);

  await userEvent.click(screen.getByRole('button', { name: 'Move Claude Max up' }));

  await expect.element(screen.getByRole('button', { name: 'Move Claude Max up' })).toHaveFocus();
});

test('the drag handle serves the pointer, moving the row it was pulled from', async () => {
  const screen = await render(<Ladder />);
  const rows = [...screen.container.querySelectorAll('li')];
  const handle = rows[2]?.querySelector('[data-drag-handle]');
  const dataTransfer = new DataTransfer();

  handle?.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
  rows[0]?.dispatchEvent(
    new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }),
  );
  rows[0]?.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));

  await expect.element(screen.getByRole('listitem').first()).toHaveTextContent('Ollama');
});

test('a row context menu carries the same two commands the buttons do', async () => {
  const screen = await render(<Ladder />);
  const rows = [...screen.container.querySelectorAll('li')];

  rows[2]?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

  await expect.element(screen.getByRole('menuitem', { name: 'Move up' })).toBeVisible();
  await expect.element(screen.getByRole('menuitem', { name: 'Move down' })).toBeVisible();
});
