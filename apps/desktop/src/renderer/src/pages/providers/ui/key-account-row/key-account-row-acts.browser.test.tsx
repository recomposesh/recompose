import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  choose,
  heldAccounts,
  press,
  renderRow,
  stored,
} from '../../testing/key-account-row.testkit';

test('the overflow holds the two quieter acts and nothing else', async () => {
  await renderRow(stored);

  await press('Actions for build');

  await expect.element(page.getByRole('menuitem', { name: 'Verify' })).toBeVisible();
  await expect.element(page.getByRole('menuitem', { name: 'Remove' })).toBeVisible();
  await expect.poll(() => page.getByRole('menuitem').elements().length).toBe(2);
});

test('removing a key takes it out of the registry it was held in', async () => {
  await renderRow(stored);

  await choose('Remove');

  await expect.poll(heldAccounts).toEqual([]);
});

test('a check answers as of the moment it ran rather than as a standing the row keeps', async () => {
  const screen = await renderRow(stored, { keyCheck: 'authenticates' });

  await choose('Verify');

  await expect.element(screen.getByRole('status')).toHaveTextContent('at the last check');
});

test('a check still out keeps Verify out of reach, so one press asks one probe', async () => {
  await renderRow(stored, {
    overrides: {
      'accounts:check-key': async () => new Promise(() => undefined),
    },
  });

  await choose('Verify');
  await press('Actions for build');

  await expect
    .element(page.getByRole('menuitem', { name: 'Verify' }))
    .toHaveAttribute('aria-disabled', 'true');
});

test('a refused check says why on the row rather than leaving the act silent', async () => {
  const screen = await renderRow(stored, {
    overrides: {
      'accounts:check-key': async () =>
        Promise.resolve({
          ok: false,
          error: { code: 'storage-failed', message: 'The stored key is missing.' },
        }),
    },
  });

  await choose('Verify');

  await expect.element(screen.getByRole('alert')).toHaveTextContent('The stored key is missing.');
});

function rightClickTheRow(container: Element): void {
  const row = container.querySelector('li');

  if (row === null) {
    throw new Error('the row never rendered');
  }

  row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
}

function listedActs(): (string | null)[] {
  return page
    .getByRole('menuitem')
    .elements()
    .map((act) => act.textContent);
}

test('a right-click on the row offers the acts the trailing control holds', async () => {
  const screen = await renderRow(stored);

  await press('Actions for build');

  const fromTheControl = listedActs();

  expect(fromTheControl.length).toBeGreaterThan(0);

  await userEvent.keyboard('{Escape}');
  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();

  rightClickTheRow(screen.container);

  await expect.element(page.getByRole('menu')).toBeVisible();

  expect(listedActs()).toEqual(fromTheControl);
});
