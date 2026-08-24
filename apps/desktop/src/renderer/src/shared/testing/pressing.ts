import { expect } from 'vitest';
import { page, userEvent } from 'vitest/browser';

type Canvas = {
  findByRole: (role: string, options: { name: string }) => Promise<HTMLElement>;
};

/**
 * Reaches a control the way a keyboard does and presses keys on it, answering the control.
 *
 * @summary A story asserting a keyboard behavior has to put focus where a person's would be first,
 * so the sequence is one step rather than three that a story can get wrong in a different order than
 * its neighbor.
 */
export async function pressedByKeyboard(
  canvas: Canvas,
  found: { role: string; name: string },
  press: (keys: string) => Promise<void>,
  keys: string,
): Promise<HTMLElement> {
  const control = await canvas.findByRole(found.role, { name: found.name });

  control.focus();
  await press(keys);

  return control;
}

/**
 * Reaches a named control the way a keyboard does and presses it, once it stands on the page.
 *
 * @summary Every row suite opens its menu the same way, so the sequence lives here rather than
 * being written again beside each row where the three steps can fall out of order.
 */
export async function pressNamedControl(name: string): Promise<void> {
  const control = page.getByRole('button', { name, exact: true });

  await expect.element(control).toBeVisible();

  control.element().focus();

  await userEvent.keyboard('{Enter}');
}

/**
 * Opens a named control's menu and chooses one act off it, the way a keyboard would.
 *
 * @summary Every row that keeps its quieter acts behind a control is exercised the same way, so
 * the two presses live here rather than beside each row that needs them.
 */
export async function chooseNamedAct(control: string, act: string): Promise<void> {
  await pressNamedControl(control);

  const item = page.getByRole('menuitem', { name: act, exact: true });

  await expect.element(item).toBeVisible();

  item.element().focus();

  await userEvent.keyboard('{Enter}');
}
