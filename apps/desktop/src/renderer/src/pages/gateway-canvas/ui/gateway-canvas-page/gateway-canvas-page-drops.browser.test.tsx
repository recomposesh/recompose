import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import type { XY } from '../../lib/canvas-positions';

import {
  pulledCable,
  releasedAt,
  sourcePortOf,
  storedBindingOf,
  targetPortOf,
} from '../../testing/canvas-gestures.testkit';
import {
  canvasCommandLine,
  canvasPageOn,
  freshCanvasRun,
  pickedTheTarget,
  renderCanvasPage,
  standCanvasBridge,
} from '../../testing/canvas-page.testkit';
import { listedModels } from '../../testing/gateway-canvas.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

function boxOf(container: HTMLElement, selector: string): DOMRect {
  const standing = container.querySelector(selector);

  if (standing === null) {
    throw new Error(`nothing stands under "${selector}"`);
  }

  return standing.getBoundingClientRect();
}

function paneSpot(container: HTMLElement, from: XY): XY {
  const pane = boxOf(container, '.react-flow');

  return { x: pane.left + from.x, y: pane.top + from.y };
}

function centreOf(box: DOMRect): XY {
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

async function portCentreOn(container: HTMLElement, nodeId: string): Promise<XY> {
  const pane = boxOf(container, '.react-flow');
  const port = (await targetPortOf(container, nodeId)).getBoundingClientRect();

  return {
    x: Math.round(port.left + port.width / 2 - pane.left),
    y: Math.round(port.top + port.height / 2 - pane.top),
  };
}

function covers(box: DOMRect, point: XY): boolean {
  return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
}

function viewportTransform(container: HTMLElement): string {
  return container.querySelector<HTMLElement>('.react-flow__viewport')?.style.transform ?? '';
}

test('a pending card born from a drop stands at the drop point, whatever the canvas is showing', async () => {
  standCanvasBridge();

  const pushCommand = canvasCommandLine();
  const screen = await renderCanvasPage();

  await expect.poll(() => viewportTransform(screen.container)).not.toBe('');

  const resting = viewportTransform(screen.container);

  pushCommand('zoom-in');
  await expect.poll(() => viewportTransform(screen.container)).not.toBe(resting);

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');

  const letGo = { x: 520, y: 470 };
  const spot = paneSpot(screen.container, letGo);

  await pulledCable(await sourcePortOf(screen.container, 'draft'), spot);
  releasedAt(spot);

  await expect.poll(async () => portCentreOn(screen.container, 'pending')).toEqual(letGo);
});

test('a draft born from the gateway keeps its incoming port exactly where the cable was released', async () => {
  const screen = await canvasPageOn();
  const letGo = { x: 510, y: 360 };
  const spot = paneSpot(screen.container, letGo);

  await pulledCable(await sourcePortOf(screen.container, 'gateway'), spot);
  releasedAt(spot);

  await expect.poll(async () => portCentreOn(screen.container, 'draft')).toEqual(letGo);
});

test('dropping a cable from the draft closes its inspector and leaves the picker standing', async () => {
  const screen = await canvasPageOn();
  const draftSpot = paneSpot(screen.container, { x: 420, y: 260 });

  await pulledCable(await sourcePortOf(screen.container, 'gateway'), draftSpot);
  releasedAt(draftSpot);
  await expect.element(screen.getByRole('complementary')).toBeVisible();

  const targetSpot = paneSpot(screen.container, { x: 650, y: 390 });

  await pulledCable(await sourcePortOf(screen.container, 'draft'), targetSpot);
  releasedAt(targetSpot);
  await pickedTheTarget(screen);

  await expect.element(screen.getByText('Pick an account', { exact: true })).toBeVisible();
  await expect.element(screen.getByRole('complementary')).not.toBeInTheDocument();
});

test('the target a completed pick materializes stands where the cable was let go', async () => {
  const screen = await canvasPageOn({
    providerModels: { ...listedModels, s1: ['claude-opus-5'] },
  });

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');

  const letGo = { x: 620, y: 420 };
  const spot = paneSpot(screen.container, letGo);

  await pulledCable(await sourcePortOf(screen.container, 'draft'), spot);
  releasedAt(spot);
  await pickedTheTarget(screen);

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Claude' }));
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'claude-opus-5' }));

  await expect
    .poll(async () => storedBindingOf('steady'))
    .toEqual({ accountId: 's1', providerModel: 'claude-opus-5' });
  await expect.poll(async () => portCentreOn(screen.container, 'target:steady')).toEqual(letGo);
});

function optionUnderTheMap(container: HTMLElement): Element {
  const map = boxOf(container, '.react-flow__minimap');
  const standing = [...container.querySelectorAll('dialog button')].find((option) =>
    covers(map, centreOf(option.getBoundingClientRect())),
  );

  if (standing === undefined) {
    throw new Error('no option of the picker stands within the canvas map');
  }

  return standing;
}

test('a picker standing over the canvas map takes the press a person aims at it', async () => {
  const screen = await canvasPageOn();
  const map = boxOf(screen.container, '.react-flow__minimap');
  const spot = { x: map.left + 4, y: map.top - 12 };

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await expect.element(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();

  await pulledCable(await sourcePortOf(screen.container, 'draft'), spot);
  releasedAt(spot);
  await pickedTheTarget(screen);

  await expect.element(screen.getByText('Pick an account', { exact: true })).toBeVisible();

  const offered = optionUnderTheMap(screen.container);
  const aimed = centreOf(offered.getBoundingClientRect());

  expect(document.elementFromPoint(aimed.x, aimed.y)?.closest('dialog')).not.toBeNull();

  await userEvent.click(offered);

  await expect.element(screen.getByText('Pick a provider model', { exact: true })).toBeVisible();
});
