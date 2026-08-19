import { useState } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import type { RouterMode } from '../../lib/routing-edits';

import { ModeRows } from './mode-rows';

const A_SWITCH_WOULD_NEED = 'Drag a cable to a provider first.';

function Choice({
  inertReasons,
}: {
  inertReasons?: Partial<Record<RouterMode, string>> | undefined;
}) {
  const [mode, setMode] = useState<RouterMode>('failover');

  return (
    <>
      <ModeRows inertReasons={inertReasons} onChangeValue={setMode} value={mode} />
      <p>{`settled on ${mode}`}</p>
    </>
  );
}

test('every mode stands as its own row, named by the word a person picks it by', async () => {
  const screen = await render(<Choice />);

  await expect.element(screen.getByRole('radiogroup', { name: 'Routing mode' })).toBeVisible();

  for (const name of ['Failover', 'Round-robin', 'Conditional']) {
    await expect.element(screen.getByRole('radio', { name, exact: true })).toBeVisible();
  }
});

test('a row carries what its mode costs, so the cost reads at the point of choice', async () => {
  const screen = await render(<Choice />);

  await expect
    .element(screen.getByRole('radio', { name: 'Failover' }))
    .toHaveAccessibleDescription(/topmost healthy provider/u);
  await expect
    .element(screen.getByRole('radio', { name: 'Round-robin' }))
    .toHaveAccessibleDescription(/prompt cache hit/u);
});

test('the mode a router stands in reads selected, and the ones it does not read unselected', async () => {
  const screen = await render(<Choice />);

  await expect.element(screen.getByRole('radio', { name: 'Failover' })).toBeChecked();
  await expect.element(screen.getByRole('radio', { name: 'Round-robin' })).not.toBeChecked();
});

test('picking a row settles the router on the mode that row names', async () => {
  const screen = await render(<Choice />);

  await userEvent.click(screen.getByRole('radio', { name: 'Round-robin' }));

  await expect.element(screen.getByText('settled on round-robin')).toBeVisible();
  await expect.element(screen.getByRole('radio', { name: 'Round-robin' })).toBeChecked();
});

test('a mode this surface cannot write cannot be chosen and says what it would need', async () => {
  const screen = await render(<Choice inertReasons={{ conditional: A_SWITCH_WOULD_NEED }} />);
  const held = screen.getByRole('radio', { name: 'Conditional' });

  await expect.element(held).toHaveAttribute('aria-disabled', 'true');
  await expect.element(held).toHaveAccessibleDescription(new RegExp(A_SWITCH_WOULD_NEED, 'u'));
});

test('the reason a mode cannot be written reads on the row itself, not only in its control', async () => {
  const screen = await render(<Choice inertReasons={{ conditional: A_SWITCH_WOULD_NEED }} />);

  await expect.element(screen.getByText(A_SWITCH_WOULD_NEED)).toBeVisible();
});

test('a mode with no reason against it stays open on the same surface', async () => {
  const screen = await render(<Choice inertReasons={{ conditional: A_SWITCH_WOULD_NEED }} />);

  await userEvent.click(screen.getByRole('radio', { name: 'Round-robin' }));

  await expect
    .element(screen.getByText(/^settled on/u))
    .toHaveTextContent('settled on round-robin');
});
