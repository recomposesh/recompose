import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';

import { Tooltip } from './tooltip';

const RESTS_LONG_ENOUGH = 3000;

function inspectorControl() {
  return (
    <Tooltip label="Inspector">
      <button type="button">
        <span aria-hidden>[]</span>
      </button>
    </Tooltip>
  );
}

const theControl = { name: 'Inspector' };

test('a control says nothing until a person asks it', async () => {
  await render(inspectorControl());

  expect(page.getByText('Inspector').elements()).toHaveLength(0);
});

test('resting on an icon-only control prints what it does', async () => {
  await render(inspectorControl());

  await userEvent.hover(page.getByRole('button', theControl));

  await expect
    .element(page.getByText('Inspector'), { timeout: RESTS_LONG_ENOUGH })
    .toBeInTheDocument();
});

test('reaching the control with the keyboard prints the same reading', async () => {
  await render(inspectorControl());

  await userEvent.tab();

  await expect
    .element(page.getByText('Inspector'), { timeout: RESTS_LONG_ENOUGH })
    .toBeInTheDocument();
});

test('the control answers to its name once, so nothing hears it twice', async () => {
  await render(inspectorControl());

  const control = page.getByRole('button', theControl);

  await userEvent.hover(control);
  await expect
    .element(page.getByText('Inspector'), { timeout: RESTS_LONG_ENOUGH })
    .toBeInTheDocument();

  await expect.element(control).toHaveAccessibleName('Inspector');
  await expect.element(control).not.toHaveAccessibleDescription('Inspector');
});

test('the reading never takes focus from the control it explains', async () => {
  await render(inspectorControl());

  await userEvent.tab();
  await expect
    .element(page.getByText('Inspector'), { timeout: RESTS_LONG_ENOUGH })
    .toBeInTheDocument();

  await expect.element(page.getByRole('button', theControl)).toHaveFocus();
});

test('a control that waits on something not built yet names it, in the reading and out loud', async () => {
  await render(
    <Tooltip label="Docs" note="Waits on the guide.">
      <button type="button">
        <span aria-hidden>?</span>
      </button>
    </Tooltip>,
  );

  const control = page.getByRole('button', { name: 'Docs' });

  await userEvent.hover(control);

  await expect
    .element(page.getByText('Docs. Waits on the guide.'), { timeout: RESTS_LONG_ENOUGH })
    .toBeInTheDocument();

  await expect.element(control).toHaveAccessibleName('Docs');
  await expect.element(control).toHaveAccessibleDescription('Waits on the guide.');
});
