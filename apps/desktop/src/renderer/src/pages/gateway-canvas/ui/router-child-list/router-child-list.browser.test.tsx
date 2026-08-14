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

type Screen = Awaited<ReturnType<typeof render>>;

async function expectChildOrder(screen: Screen, names: readonly string[]): Promise<void> {
  const rows = screen.getByRole('listitem');

  expect(rows.elements()).toHaveLength(names.length);

  for (const [place, name] of names.entries()) {
    await expect.element(rows.nth(place)).toHaveTextContent(name);
  }
}

test('a failover ladder prints a rank on every row, so the order reads without counting', async () => {
  const screen = await render(<Ladder />);

  await expect.element(screen.getByRole('list', { name: 'Children' })).toBeVisible();
  await expect.element(screen.getByText('1', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('2', { exact: true })).toBeVisible();
  await expect.element(screen.getByText('3', { exact: true })).toBeVisible();
});

test('a round-robin child list carries no rank and no way to order it', async () => {
  const screen = await render(<Ladder mode="round-robin" />);

  await expect.element(screen.getByText('Ollama')).toBeVisible();
  await expect.element(screen.getByText('1', { exact: true })).not.toBeInTheDocument();
  await expect.element(screen.getByRole('button', { name: /^Move/u })).not.toBeInTheDocument();
});

test('the keyboard alone moves the third child up one rank', async () => {
  const screen = await render(<Ladder />);

  await userEvent.click(screen.getByRole('button', { name: 'Move Ollama up' }));

  await expectChildOrder(screen, ['Work key', 'Ollama', 'Claude Max']);
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

  await expectChildOrder(screen, ['Work key', 'Claude Max', 'Ollama']);
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
