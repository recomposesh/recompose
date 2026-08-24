import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';

import { ContextMenu } from './context-menu';

function gatewayActions(onSelect = vi.fn()) {
  return [
    { label: 'Start', onSelect },
    { label: 'Copy address', onSelect },
    { label: 'Delete gateway…', tone: 'danger' as const, onSelect },
  ];
}

function rightClick(name: string): void {
  const [surface] = page.getByText(name).elements();

  surface?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
}

test('the acts stay away until a right-click asks for them', async () => {
  await render(<ContextMenu items={gatewayActions()}>Local gateway</ContextMenu>);

  await expect.element(page.getByText('Local gateway')).toBeVisible();

  expect(page.getByRole('menuitem').elements()).toHaveLength(0);
});

test('a right-click lays the surface acts out in reading order', async () => {
  await render(<ContextMenu items={gatewayActions()}>Local gateway</ContextMenu>);

  rightClick('Local gateway');

  await expect.element(page.getByRole('menu')).toBeVisible();

  expect(
    page
      .getByRole('menuitem')
      .elements()
      .map((act) => act.textContent),
  ).toEqual(['Start', 'Copy address', 'Delete gateway…']);
});

test('choosing an act runs it and takes the menu away', async () => {
  const onSelect = vi.fn();

  await render(<ContextMenu items={gatewayActions(onSelect)}>Local gateway</ContextMenu>);

  rightClick('Local gateway');

  await page.getByRole('menuitem', { name: 'Copy address' }).click();

  expect(onSelect).toHaveBeenCalledTimes(1);

  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
});

test('dismissing the menu runs nothing', async () => {
  const onSelect = vi.fn();

  await render(<ContextMenu items={gatewayActions(onSelect)}>Local gateway</ContextMenu>);

  rightClick('Local gateway');

  await expect.element(page.getByRole('menu')).toBeVisible();

  await userEvent.keyboard('{Escape}');

  expect(onSelect).not.toHaveBeenCalled();
  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
});

test('the surface a caller names is the element the right-click lands on', async () => {
  await render(
    <ContextMenu className="truncate" items={gatewayActions()} render={<li />}>
      Local gateway
    </ContextMenu>,
  );

  const [surface] = page.getByText('Local gateway').elements();

  expect(surface?.tagName).toBe('LI');
  expect(surface?.classList.contains('truncate')).toBe(true);
});
