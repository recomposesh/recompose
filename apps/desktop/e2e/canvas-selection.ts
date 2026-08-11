import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { emptyCanvasSpot, fitCanvasToView } from './canvas-gestures';
import { canvasCable, canvasNode } from './canvas-screen';

/** The frame of a card, which is the one thing on it that carries whether it stands selected. */
export function nodeCard(page: Page, nodeId: string): Locator {
  return canvasNode(page, nodeId).locator('button[aria-pressed]');
}

/** Presses a card, bringing the whole composition into the pane first so the press can land. */
export async function nodeStandsSelected(page: Page, nodeId: string): Promise<void> {
  await fitCanvasToView(page);
  await nodeCard(page, nodeId).click();
  await expect(nodeCard(page, nodeId)).toHaveAttribute('aria-pressed', 'true');
}

/** Presses a standing cable, which selects the binding it carries. */
export async function cableStandsSelected(page: Page, cable: string): Promise<void> {
  await fitCanvasToView(page);
  await canvasCable(page, cable).click();
  await expect(canvasCable(page, cable)).toHaveClass(/selected/u);
}

/** Presses the canvas where nothing stands, which is how a person puts a selection away. */
export async function theEmptyCanvasIsPressed(page: Page): Promise<void> {
  const spot = await emptyCanvasSpot(page);

  await page.mouse.click(spot.x, spot.y);
}
