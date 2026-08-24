import { expect } from 'vitest';
import { page, userEvent } from 'vitest/browser';

/**
 * Reaches a named control the way a keyboard does and presses it, once it stands on the page.
 *
 * @summary Every row on this page keeps its quieter acts behind one control, so the three steps
 * live here rather than beside each row, where they can fall out of order one suite at a time.
 */
export async function pressNamedControl(name: string): Promise<void> {
  const control = page.getByRole('button', { name, exact: true });

  await expect.element(control).toBeVisible();

  control.element().focus();

  await userEvent.keyboard('{Enter}');
}

/** Opens a named control's menu and chooses one act off it, the way a keyboard would. */
export async function chooseNamedAct(control: string, act: string): Promise<void> {
  await pressNamedControl(control);

  const item = page.getByRole('menuitem', { name: act, exact: true });

  await expect.element(item).toBeVisible();

  item.element().focus();

  await userEvent.keyboard('{Enter}');
}
