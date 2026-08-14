import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';

import { CableFailureChip } from './cable-failure-chip';

const REFUSED = 'The gateway could not reach the target.';

async function renderChip() {
  return render(<CableFailureChip detail={REFUSED} status={502} />);
}

/**
 * The reading, wherever it stands.
 *
 * @summary It is a popover, so it renders outside the tree the chip sits in and does not exist at
 * all until somebody asks. Both are why these read it off the page by its role rather than looking
 * for a hidden box beside the chip.
 */
function theError() {
  return page.getByRole('dialog', { name: 'Last error' });
}

test('the chip stands as a press a person can find, and says nothing until they ask', async () => {
  const screen = await renderChip();

  await expect.element(screen.getByRole('button', { name: /last error/i })).toBeVisible();
  expect(theError().elements()).toHaveLength(0);
});

test('pressing the chip shows what the last request came to, in the sentence and the status', async () => {
  const screen = await renderChip();

  await userEvent.click(screen.getByRole('button', { name: /last error/i }));

  await expect.element(theError()).toBeVisible();
  await expect.element(theError()).toHaveTextContent(REFUSED);
  await expect.element(theError()).toHaveTextContent(/Status 502/u);
});

test('pressing the chip again puts the error away, so the canvas comes back uncovered', async () => {
  const screen = await renderChip();
  const chip = screen.getByRole('button', { name: /last error/i });

  await userEvent.click(chip);
  await expect.element(theError()).toBeVisible();

  await userEvent.click(chip);

  await expect.poll(() => theError().elements().length).toBe(0);
});

test('a press anywhere outside the reading puts the error away', async () => {
  const screen = await renderChip();

  await userEvent.click(screen.getByRole('button', { name: /last error/i }));
  await expect.element(theError()).toBeVisible();

  await userEvent.click(document.body);

  await expect.poll(() => theError().elements().length).toBe(0);
});

test('a press inside the reading leaves it standing', async () => {
  const screen = await renderChip();

  await userEvent.click(screen.getByRole('button', { name: /last error/i }));
  await userEvent.click(page.getByText(REFUSED));

  await expect.element(theError()).toBeVisible();
});

test('Escape puts the error away, which is the way out that changes nothing', async () => {
  const screen = await renderChip();

  await userEvent.click(screen.getByRole('button', { name: /last error/i }));
  await expect.element(theError()).toBeVisible();

  await userEvent.keyboard('{Escape}');

  await expect.poll(() => theError().elements().length).toBe(0);
});

test('a key that is not Escape leaves a standing reading standing', async () => {
  const screen = await renderChip();
  const chip = screen.getByRole('button', { name: /last error/i });

  await userEvent.click(chip);
  await expect.element(theError()).toBeVisible();

  chip.element().focus();
  await userEvent.keyboard('a');

  await expect.element(theError()).toBeVisible();
});
