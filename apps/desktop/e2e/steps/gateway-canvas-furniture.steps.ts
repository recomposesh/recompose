import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

import type { Seat } from '../canvas-screen';

import {
  canvasTool,
  minimap,
  minimapCards,
  nodeSeats,
  standingNodes,
  viewportZoom,
} from '../canvas-screen';
import { Given, Then, When } from '../fixtures';
import { seedGateway } from '../gateway-screen';
import { focusedGateway, focusGateway } from '../scenario-memory';
import {
  accountHeldAs,
  GATEWAY_A_SCENARIO_ACTS_ON,
  gatewayTargetingAKey,
} from '../stored-target-accounts';
import { bindingOf, seedVirtualModels } from '../stored-virtual-models';

/** The definition the composition here holds, named once so every step means the same card. */
const BOUND_MODEL = 'fast';

/** The real model the stored Anthropic key account serves, which the binding names. */
const SERVED_MODEL = 'claude-sonnet-5';

/** Either half of the pair every color token carries, which is what a scheme picks between. */
type Scheme = 'dark' | 'light';

/** Where a ground stops reading dark, on the nought-to-255 scale a channel is measured on. */
const MID_LIGHTNESS = 128;

/** How much each channel carries of what an eye reads as lightness, red through blue. */
const CHANNEL_WEIGHTS = [0.2126, 0.7152, 0.0722];

const CHANNELS = /rgba?\((\d+),\s*(\d+),\s*(\d+)/u;

/** Where the canvas stood before a zoom, which magnifying and keeping are both read against. */
type RestingView = { zoom: number; seats: Record<string, Seat> };

const viewsBeforeAZoom = new WeakMap<Page, RestingView>();

function viewBeforeTheZoom(page: Page): RestingView {
  const held = viewsBeforeAZoom.get(page);

  if (held === undefined) {
    throw new Error('no step in this scenario read the view the zoom acted on');
  }

  return held;
}

/** Which scheme the app paints under, which the platform rather than the page decides. */
async function paintedScheme(page: Page): Promise<Scheme> {
  return page.evaluate(() =>
    matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );
}

/**
 * The ground a piece of furniture stands on, which is its own paint or whatever paints behind it.
 *
 * @operation The map draws into a picture the canvas gives no ground of its own, so a reading that
 * stopped at the first transparent answer would report the same nothing under either scheme. The
 * walk carries on out to the card holding the picture, which is the ground a person actually sees.
 */
async function groundBehind(furniture: Locator): Promise<string> {
  return furniture.evaluate((standing) => {
    for (let held: Element | null = standing; held !== null; held = held.parentElement) {
      const painted = getComputedStyle(held).backgroundColor;

      if (!painted.startsWith('rgba(0, 0, 0, 0')) {
        return painted;
      }
    }

    return 'rgba(0, 0, 0, 0)';
  });
}

/** Which scheme a ground belongs to, read off how light it paints rather than what names it. */
function schemeOfGround(painted: string): Scheme {
  const found = CHANNELS.exec(painted);

  if (found === null) {
    throw new Error(`the furniture stands on no readable ground, only "${painted}"`);
  }

  const lightness = CHANNEL_WEIGHTS.reduce(
    (carried, weight, channel) => carried + weight * Number(found[channel + 1]),
    0,
  );

  return lightness < MID_LIGHTNESS ? 'dark' : 'light';
}

async function schemeBehind(furniture: Locator): Promise<Scheme> {
  return schemeOfGround(await groundBehind(furniture));
}

Given('a gateway holding a virtual model bound to a target', async ({ page }) => {
  await gatewayTargetingAKey(page);

  const target = await accountHeldAs(page, 'api-key');
  const bound = bindingOf(BOUND_MODEL, target.id, SERVED_MODEL);

  await seedVirtualModels(page, focusedGateway(page), [bound]);
});

/**
 * Puts the app in dark and leaves a gateway standing for the detail a later step opens.
 *
 * @summary The scheme is settings rather than scenery, so the step writes it the way the settings
 * screen writes it and waits for the window to repaint under it, since everything the scenario
 * goes on to read is painted by that repaint.
 */
Given('the app in the dark scheme', async ({ page }) => {
  await seedGateway(page, GATEWAY_A_SCENARIO_ACTS_ON);
  focusGateway(page, GATEWAY_A_SCENARIO_ACTS_ON);

  const saved = await page.evaluate(async () =>
    window.recompose['settings:save']({ theme: 'dark' }),
  );

  if (!saved.ok) {
    throw new Error(`the app kept its scheme: ${saved.error.message}`);
  }

  await expect.poll(async () => paintedScheme(page)).toBe('dark');
});

When('the person presses the zoom-in control', async ({ page }) => {
  viewsBeforeAZoom.set(page, { zoom: await viewportZoom(page), seats: await nodeSeats(page) });

  await canvasTool(page, 'Zoom in').click();
});

Then('the minimap draws every node of the composition', async ({ page }) => {
  const standing = await standingNodes(page);

  await expect(minimap(page)).toBeVisible();

  expect(standing.length).toBeGreaterThan(1);
  await expect.poll(async () => minimapCards(page)).toBe(standing.length);
});

Then('the canvas view magnifies', async ({ page }) => {
  await expect.poll(async () => viewportZoom(page)).toBeGreaterThan(viewBeforeTheZoom(page).zoom);
});

Then('the nodes keep their arrangement', async ({ page }) => {
  expect(await nodeSeats(page)).toEqual(viewBeforeTheZoom(page).seats);
});

Then('the minimap and the zoom controls draw in the dark scheme', async ({ page }) => {
  expect(await schemeBehind(minimap(page))).toBe('dark');
  expect(await schemeBehind(canvasTool(page, 'Reset zoom'))).toBe('dark');
});
