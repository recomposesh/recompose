import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import type { XY } from '../../lib/canvas-positions';

import {
  draftCardOn,
  draggedCable,
  pulledCable,
  reconnectAnchorOf,
  releasedAt,
  sourcePortOf,
  storedBindingOf,
  storedModels,
  targetPortOf,
} from '../../testing/canvas-gestures.testkit';
import { canvasPageOn, freshCanvasRun, pickedTheTarget } from '../../testing/canvas-page.testkit';
import { ladderUnder } from '../../testing/routed-canvas.testkit';
import { pooledWorld } from '../../testing/routed-gateways.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const POSITIONS_KEY = 'recompose.canvas.positions.my-gateway';

function seatedInsideThePane(): void {
  localStorage.setItem(POSITIONS_KEY, JSON.stringify({ 'target:fast': { x: 560, y: 280 } }));
}

function paneSpot(container: HTMLElement, from: XY): XY {
  const box = container.querySelector('.react-flow')?.getBoundingClientRect() ?? new DOMRect();

  return { x: box.left + from.x, y: box.top + from.y };
}

async function rebindPickOnCreative(screen: Awaited<ReturnType<typeof canvasPageOn>>) {
  await draggedCable(
    await reconnectAnchorOf(screen.container, 'cable:creative'),
    await targetPortOf(screen.container, 'target:fast'),
  );
  await expect.element(screen.getByText(/^Models .+ serves$/)).toBeVisible();
}

test('a pick answered after its definition left the gateway rebinds nothing', async () => {
  seatedInsideThePane();

  const screen = await canvasPageOn();

  await rebindPickOnCreative(screen);

  await userEvent.click(screen.getByRole('button', { name: /Creative/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Delete virtual model' }));
  await userEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));

  await expect.poll(async () => storedBindingOf('creative')).toBeUndefined();
  await expect.element(screen.getByText(/^Models .+ serves$/)).toBeVisible();

  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect.element(screen.getByText(/^Models .+ serves$/)).toBeVisible();
  expect((await storedModels()).map((model) => model.id)).toEqual(['fast']);
});

test('the pick outlives its anchor card and still lands where a person takes it', async () => {
  seatedInsideThePane();

  const screen = await canvasPageOn();

  await rebindPickOnCreative(screen);

  await userEvent.click(screen.getByRole('button', { name: /Fast/ }));
  await userEvent.keyboard('{Delete}');
  await userEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));

  await expect.poll(async () => storedBindingOf('fast')).toBeUndefined();
  await expect.element(screen.getByText(/^Models .+ serves$/)).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Select a different provider' }));

  await expect.element(screen.getByText('Connected providers', { exact: true })).toBeVisible();

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect
    .poll(async () => storedBindingOf('creative'))
    .toEqual({ accountId: 'k1', providerModel: 'claude-sonnet-5' });
});

async function deletedThePool(screen: Awaited<ReturnType<typeof canvasPageOn>>): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: /Pooled/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Delete virtual model' }));
  await userEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));

  await expect.poll(async () => ladderUnder('pooled')).toBeUndefined();
}

test('a child pick answered after its pool left the gateway joins no ladder', async () => {
  const screen = await canvasPageOn(pooledWorld);

  await draggedCable(
    await sourcePortOf(screen.container, 'route:pooled'),
    await targetPortOf(screen.container, 'target:fast'),
  );
  await expect.element(screen.getByText(/^Models .+ serves$/)).toBeVisible();

  await deletedThePool(screen);
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect.element(screen.getByText(/^Models .+ serves$/)).toBeVisible();
  expect((await storedModels()).map((model) => model.id)).toEqual(['fast']);
});

test("a child rebind answered after its pool left the gateway moves nobody's binding", async () => {
  const screen = await canvasPageOn(pooledWorld);

  await draggedCable(
    await reconnectAnchorOf(screen.container, 'cable:pooled:t2'),
    await targetPortOf(screen.container, 'target:fast'),
  );
  await expect.element(screen.getByText(/^Models .+ serves$/)).toBeVisible();

  await deletedThePool(screen);
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect.element(screen.getByText(/^Models .+ serves$/)).toBeVisible();
  expect(await storedBindingOf('fast')).toEqual({
    accountId: 'k1',
    providerModel: 'claude-haiku-4-5',
  });
});

/**
 * The ask stands open over the canvas while this runs, so the card is reached through its own
 * handler rather than through the pointer: a panel a scenario needs open is a panel in the way.
 */
function pressedThrough(card: Element): void {
  card.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  if (card instanceof HTMLElement) {
    card.focus();
  }
}

test('a pick answered after its draft left refuses out loud and stores nothing', async () => {
  const screen = await canvasPageOn();
  const spot = paneSpot(screen.container, { x: 520, y: 420 });

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');
  await pulledCable(await sourcePortOf(screen.container, 'draft'), spot);
  releasedAt(spot);
  await pickedTheTarget(screen);
  await expect.element(screen.getByText('Connected providers', { exact: true })).toBeVisible();

  pressedThrough(screen.getByRole('button', { name: /Steady/ }).element());
  await userEvent.keyboard('{Delete}');

  await expect.element(screen.getByText(/Delete the virtual model "Steady"/)).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));

  await expect.poll(() => draftCardOn(screen.container)).toBeNull();

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'work' }));
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'claude-opus-5' }));

  await expect
    .poll(() => screen.container.querySelector('section > p[aria-live="assertive"]')?.textContent, {
      timeout: 10_000,
    })
    .toContain('Refused the binding.');
  await expect
    .element(screen.getByText('Connected providers', { exact: true }))
    .not.toBeInTheDocument();
  expect((await storedModels()).length).toBe(2);
});
