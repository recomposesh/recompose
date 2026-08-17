import type { ElectronApplication, Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { chooseMenuItemAt, menuItemAccelerator } from '../app-menu';
import { canvasNode, GATEWAY_NODE } from '../canvas-screen';
import { Given, Then } from '../fixtures';

async function viewportScale(page: Page): Promise<number> {
  const transform = await page
    .locator('.react-flow__viewport')
    .evaluate((viewport) => viewport.style.transform);
  const scale = /scale\((?<factor>[\d.]+)\)/.exec(transform)?.groups?.['factor'];

  return scale === undefined ? 1 : Number(scale);
}

async function acceleratorCount(app: ElectronApplication, chord: string): Promise<number> {
  return app.evaluate(({ Menu }, wanted) => {
    type MenuItems = NonNullable<ReturnType<typeof Menu.getApplicationMenu>>['items'];

    const claimsIn = (items: MenuItems): number =>
      items.reduce(
        (claims, item) =>
          claims + (item.accelerator === wanted ? 1 : 0) + claimsIn(item.submenu?.items ?? []),
        0,
      );

    return claimsIn(Menu.getApplicationMenu()?.items ?? []);
  }, chord);
}

Given('the person zoomed the canvas away from 100%', async ({ electronApp, page }) => {
  await chooseMenuItemAt(electronApp, ['Gateway', 'Zoom In']);
  await expect.poll(async () => viewportScale(page)).not.toBe(1);
});

Then('the canvas stands at 100%', async ({ page }) => {
  await expect.poll(async () => viewportScale(page)).toBe(1);
});

Then('the canvas fits the whole composition in view', async ({ page }) => {
  await expect(canvasNode(page, GATEWAY_NODE)).toBeInViewport();
});

Then('Actual Size prints 0 under the command modifier', async ({ electronApp }) => {
  expect(await menuItemAccelerator(electronApp, ['Gateway', 'Actual Size'])).toBe('CmdOrCtrl+0');
});

Then('Zoom to Fit prints 0 under the command and shift modifiers', async ({ electronApp }) => {
  expect(await menuItemAccelerator(electronApp, ['Gateway', 'Zoom to Fit'])).toBe(
    'Shift+CmdOrCtrl+0',
  );
});

Then(
  'Tidy Up prints an Option-modified shortcut no other item on the route claims',
  async ({ electronApp }) => {
    const chord = await menuItemAccelerator(electronApp, ['Gateway', 'Tidy Up']);

    expect(chord).toBe('Alt+CmdOrCtrl+T');
    expect(await acceleratorCount(electronApp, 'Alt+CmdOrCtrl+T')).toBe(1);
  },
);
