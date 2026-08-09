import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { CableFailureChip } from './cable-failure-chip';

const REFUSED = 'The gateway could not reach the target.';

async function renderChip() {
  return render(<CableFailureChip detail={REFUSED} status={502} />);
}

test('the chip stands as a press a person can find, and says nothing until they ask', async () => {
  const screen = await renderChip();

  await expect.element(screen.getByRole('button', { name: /last error/i })).toBeVisible();
  await expect.element(screen.getByText(REFUSED)).not.toBeVisible();
});

test('pressing the chip shows what the last request came to, in the sentence and the status', async () => {
  const screen = await renderChip();

  await userEvent.click(screen.getByRole('button', { name: /last error/i }));

  await expect.element(screen.getByText(REFUSED)).toBeVisible();
  await expect.element(screen.getByText(/Status 502/)).toBeVisible();
});

test('pressing the chip again puts the error away, so the canvas comes back uncovered', async () => {
  const screen = await renderChip();
  const chip = screen.getByRole('button', { name: /last error/i });

  await userEvent.click(chip);
  await expect.element(screen.getByText(REFUSED)).toBeVisible();

  await userEvent.click(chip);
  await expect.element(screen.getByText(REFUSED)).not.toBeVisible();
});

test('Escape puts the error away, which is the way out that changes nothing', async () => {
  const screen = await renderChip();

  await userEvent.click(screen.getByRole('button', { name: /last error/i }));
  await expect.element(screen.getByText(REFUSED)).toBeVisible();

  await userEvent.keyboard('{Escape}');

  await expect.element(screen.getByText(REFUSED)).not.toBeVisible();
});

test('the chip says out loud whether the error stands open, so a screen reader reads the same state', async () => {
  const screen = await renderChip();
  const chip = screen.getByRole('button', { name: /last error/i });

  await expect.element(chip).toHaveAttribute('aria-expanded', 'false');

  await userEvent.click(chip);

  await expect.element(chip).toHaveAttribute('aria-expanded', 'true');
});
