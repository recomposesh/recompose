import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { canvasTool, minimap, modelNodeId } from '../canvas-screen';
import { nodeCard } from '../canvas-selection';
import { Given, Then, When } from '../fixtures';
import { drawerHeight, logsHeightHandle, logsHeading } from '../logs-drawer';
import { SERVING_GATEWAY } from '../served-gateway';
import { draggedHeightBefore, rememberDraggedHeight } from '../telemetry-memory';

/** How far up the border travels, which is inside the sizes the drawer's content reads at. */
const UPWARD = 90;

/** How far down the border travels to put the drawer away, well past its smallest size. */
const WELL_BELOW = 220;

/**
 * Drags the border on the drawer's top edge, in the several moves a drag is read from.
 *
 * @operation The border watches the window for the moves rather than itself, so the pointer travels
 * in steps and lets go where it stopped, which is how a person's own drag arrives.
 */
async function theTopEdgeTravels(page: Page, by: number): Promise<void> {
  const border = logsHeightHandle(page);
  const box = await border.boundingBox();

  if (box === null) {
    throw new Error('the drawer stands with no border a drag could take hold of');
  }

  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y + by * 0.25);
  await page.mouse.move(from.x, from.y + by * 0.6);
  await page.mouse.move(from.x, from.y + by);
  await page.mouse.up();
}

Given('the person dragged the drawer taller', async ({ page }) => {
  const stood = await drawerHeight(page);

  await theTopEdgeTravels(page, -UPWARD);
  await expect.poll(async () => drawerHeight(page)).toBeGreaterThan(stood);

  rememberDraggedHeight(page, await drawerHeight(page));
});

When('the person reads the canvas above the drawer', async ({ page }) => {
  await expect(logsHeading(page, SERVING_GATEWAY)).toBeVisible();
});

When("the person drags the drawer's top edge upward", async ({ page }) => {
  rememberDraggedHeight(page, await drawerHeight(page));
  await theTopEdgeTravels(page, -UPWARD);
});

When('the person drags the top edge well below the smallest height', async ({ page }) => {
  await theTopEdgeTravels(page, WELL_BELOW);
});

Then('the zoom controls and the minimap stand visible', async ({ page }) => {
  await expect(canvasTool(page, 'Zoom in')).toBeVisible();
  await expect(canvasTool(page, 'Zoom out')).toBeVisible();
  await expect(minimap(page)).toBeVisible();
});

Then('the node takes selection', async ({ page }) => {
  await expect(nodeCard(page, modelNodeId('creative'))).toHaveAttribute('aria-pressed', 'true');
});

Then('the drawer stands taller', async ({ page }) => {
  await expect.poll(async () => drawerHeight(page)).toBeGreaterThan(draggedHeightBefore(page));
});

Then('the drawer stands at the dragged height', async ({ page }) => {
  await expect.poll(async () => drawerHeight(page)).toBe(draggedHeightBefore(page));
});

Then('the drawer closes', async ({ page }) => {
  await expect(logsHeading(page, SERVING_GATEWAY)).toBeHidden();
});
