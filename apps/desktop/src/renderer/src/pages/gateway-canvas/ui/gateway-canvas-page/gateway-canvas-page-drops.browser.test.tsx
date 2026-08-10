import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import type { XY } from '../../lib/canvas-positions';

import {
  pulledCable,
  releasedAt,
  sourcePortOf,
  storedBindingOf,
} from '../../testing/canvas-gestures.testkit';
import {
  canvasCommandLine,
  canvasPageOn,
  freshCanvasRun,
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

function cardCornerOn(container: HTMLElement, nodeId: string): XY | undefined {
  const card = container.querySelector(`.react-flow__node[data-id="${nodeId}"]`);

  if (card === null) {
    return undefined;
  }

  const pane = boxOf(container, '.react-flow');
  const box = card.getBoundingClientRect();

  return { x: Math.round(box.left - pane.left), y: Math.round(box.top - pane.top) };
}

function centreOf(box: DOMRect): XY {
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
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

  const letGo = { x: 520, y: 470 };
  const spot = paneSpot(screen.container, letGo);

  await pulledCable(await sourcePortOf(screen.container, 'model:creative'), spot);
  releasedAt(spot);

  await expect.poll(() => cardCornerOn(screen.container, 'pending')).toEqual(letGo);
});

test('the target a completed pick materializes stands where the cable was let go', async () => {
  const screen = await canvasPageOn({
    providerModels: { ...listedModels, s1: ['claude-opus-5'] },
  });
  const letGo = { x: 620, y: 420 };
  const spot = paneSpot(screen.container, letGo);

  await pulledCable(await sourcePortOf(screen.container, 'model:creative'), spot);
  releasedAt(spot);

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Claude' }));
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'claude-opus-5' }));

  await expect
    .poll(async () => storedBindingOf('creative'))
    .toEqual({ accountId: 's1', providerModel: 'claude-opus-5' });
  await expect.poll(() => cardCornerOn(screen.container, 'target:s1')).toEqual(letGo);
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
  const spot = { x: map.left + 4, y: map.top - 56 };

  await pulledCable(await sourcePortOf(screen.container, 'model:creative'), spot);
  releasedAt(spot);

  await expect.element(screen.getByText('Pick an account', { exact: true })).toBeVisible();

  const offered = optionUnderTheMap(screen.container);
  const aimed = centreOf(offered.getBoundingClientRect());

  expect(document.elementFromPoint(aimed.x, aimed.y)?.closest('dialog')).not.toBeNull();

  await userEvent.click(offered);

  await expect.element(screen.getByText('Pick a provider model', { exact: true })).toBeVisible();
});
