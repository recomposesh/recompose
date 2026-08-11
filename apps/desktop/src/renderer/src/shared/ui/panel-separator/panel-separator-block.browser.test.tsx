import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { panelBounds } from '../../lib';
import { PanelSeparator } from './panel-separator';

const bounds = panelBounds.inspector;

type Settled = { sizes: number[]; collapses: number; restores: number };

async function renderDrawerEdge(panelEdge: 'leading' | 'trailing', standing = 320, shut = false) {
  const settled: Settled = { sizes: [], collapses: 0, restores: 0 };

  const screen = await render(
    <PanelSeparator
      axis="block"
      bounds={bounds}
      label="Drawer height"
      onCollapse={() => {
        settled.collapses += 1;
      }}
      onResize={(asked) => {
        settled.sizes.push(asked);
      }}
      onRestore={() => {
        settled.restores += 1;
      }}
      onSettled={() => {}}
      panelEdge={panelEdge}
      shut={shut}
      width={standing}
    />,
  );

  return { screen, settled };
}

const theSeparator = { name: 'Drawer height' };

function dragTo(handle: Element, from: number, to: number) {
  handle.dispatchEvent(
    new PointerEvent('pointerdown', { pointerId: 1, clientY: from, bubbles: true }),
  );
  window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientY: to }));
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientY: to }));
}

test('a separator across the column is announced as the horizontal border it is', async () => {
  const { screen } = await renderDrawerEdge('leading');
  const handle = screen.getByRole('separator', theSeparator);

  await expect.element(handle).toHaveAttribute('aria-orientation', 'horizontal');
  await expect.element(handle).toHaveAttribute('aria-valuenow', '320');
  await expect.element(handle).toHaveAttribute('aria-valuemax', String(bounds.max));
});

test('dragging the edge of a drawer upward grows the drawer under it', async () => {
  const { screen, settled } = await renderDrawerEdge('leading');

  dragTo(screen.getByRole('separator', theSeparator).element(), 400, 360);

  expect(settled.sizes.at(-1)).toBe(360);
});

test('dragging that same edge downward shrinks the drawer', async () => {
  const { screen, settled } = await renderDrawerEdge('leading');

  dragTo(screen.getByRole('separator', theSeparator).element(), 400, 440);

  expect(settled.sizes.at(-1)).toBe(280);
});

test('a trailing panel grows the other way, because the edge means the same on either axis', async () => {
  const { screen, settled } = await renderDrawerEdge('trailing');

  dragTo(screen.getByRole('separator', theSeparator).element(), 400, 440);

  expect(settled.sizes.at(-1)).toBe(360);
});

test('a drag well past the shortest height shuts the drawer rather than slivering it', async () => {
  const { screen, settled } = await renderDrawerEdge('leading');

  dragTo(screen.getByRole('separator', theSeparator).element(), 400, 600);

  expect(settled.collapses).toBe(1);
});

test('travel across the border sizes nothing, since only travel along the axis counts', async () => {
  const { screen, settled } = await renderDrawerEdge('leading');
  const handle = screen.getByRole('separator', theSeparator).element();

  handle.dispatchEvent(
    new PointerEvent('pointerdown', { pointerId: 1, clientX: 400, clientY: 400, bubbles: true }),
  );
  window.dispatchEvent(
    new PointerEvent('pointermove', { pointerId: 1, clientX: 600, clientY: 400 }),
  );

  expect(settled.sizes).toEqual([320]);
  expect(settled.collapses).toBe(0);
});

test('the up and down arrows size the drawer a step at a time', async () => {
  const { screen, settled } = await renderDrawerEdge('leading');

  screen.getByRole('separator', theSeparator).element().focus();
  await userEvent.keyboard('{ArrowUp}');

  expect(settled.sizes.at(-1)).toBe(320 + bounds.step);

  await userEvent.keyboard('{ArrowDown}');

  expect(settled.sizes.at(-1)).toBe(320 - bounds.step);
});

test('the arrows of the other axis leave the drawer exactly as it stands', async () => {
  const { screen, settled } = await renderDrawerEdge('leading');

  screen.getByRole('separator', theSeparator).element().focus();
  await userEvent.keyboard('{ArrowLeft}');
  await userEvent.keyboard('{ArrowRight}');

  expect(settled.sizes).toEqual([]);
  expect(settled.collapses).toBe(0);
});

test('Enter shuts the drawer, so a keyboard reaches the collapse a drag makes', async () => {
  const { screen, settled } = await renderDrawerEdge('leading');

  screen.getByRole('separator', theSeparator).element().focus();
  await userEvent.keyboard('{Enter}');

  expect(settled.collapses).toBe(1);
});

test('Enter brings a shut drawer back on this axis too', async () => {
  const { screen, settled } = await renderDrawerEdge('leading', 320, true);

  screen.getByRole('separator', theSeparator).element().focus();
  await userEvent.keyboard('{Enter}');

  expect(settled.restores).toBe(1);
  expect(settled.collapses).toBe(0);
});

test('the arrow that would grow a shut drawer brings it back instead', async () => {
  const { screen, settled } = await renderDrawerEdge('leading', 320, true);

  screen.getByRole('separator', theSeparator).element().focus();
  await userEvent.keyboard('{ArrowUp}');

  expect(settled.restores).toBe(1);

  await userEvent.keyboard('{ArrowDown}');

  expect(settled.restores).toBe(1);
});

test('dragging out of a shut drawer brings it back rather than doing nothing', async () => {
  const { screen, settled } = await renderDrawerEdge('leading', 320, true);

  dragTo(
    screen.getByRole('separator', theSeparator).element(),
    400,
    400 - bounds.collapseBelow - 20,
  );

  expect(settled.restores).toBe(1);
  expect(settled.sizes).toEqual([]);
});
