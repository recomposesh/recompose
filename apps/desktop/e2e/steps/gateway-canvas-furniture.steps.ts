import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

import type { Seat } from '../canvas-screen';

import {
  canvasNode,
  canvasTool,
  minimap,
  minimapCards,
  modelNodeId,
  nodeSeats,
  openGatewayCanvas,
  standingNodes,
  targetNodeId,
  viewportZoom,
} from '../canvas-screen';
import { Given, Then, When } from '../fixtures';
import { aRoutedModelStands, FIRST_TARGET, SECOND_TARGET } from '../routed-gateway';
import { focusedGateway } from '../scenario-memory';
import {
  accountHeldAs,
  gatewayTargetingAKey,
  theGatewayAScenarioActsOn,
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

async function aCompositionStands(page: Page): Promise<void> {
  await gatewayTargetingAKey(page);

  const target = await accountHeldAs(page, 'api-key');
  const bound = bindingOf(BOUND_MODEL, target.id, SERVED_MODEL);

  await seedVirtualModels(page, focusedGateway(page), [bound]);
}

Given('a gateway holding a virtual model bound to a target', async ({ page }) => {
  await aCompositionStands(page);
});

/**
 * A composition whose model reaches its targets through a router.
 *
 * @summary The minimap mirrors whatever the canvas seats, so the scenario that proves it has to
 * meet every node kind the canvas can seat. A router seats a fourth kind between the model and its
 * targets, and it is the one kind no other furniture scenario stands.
 */
Given(
  'a gateway holding a virtual model bound to a failover router over two targets',
  async ({ page, scriptedProvider }) => {
    await aRoutedModelStands(page, scriptedProvider, {
      model: BOUND_MODEL,
      mode: 'failover',
      targets: [FIRST_TARGET, SECOND_TARGET],
    });
  },
);

/**
 * A composition standing open, rather than a gateway standing alone.
 *
 * @summary A gateway with nothing bound seats one card, and the canvas seats it at the origin. The
 * origin is a fixed point of any scaling, so a zoom that wrongly re-seated every card would leave
 * that one card where it was and pass. Three cards, two of them away from the origin, is what makes
 * the arrangement something a zoom can be caught moving.
 */
Given('an open gateway detail holding a composition', async ({ page }) => {
  await aCompositionStands(page);
  await openGatewayCanvas(page, focusedGateway(page));

  await expect(canvasNode(page, modelNodeId(BOUND_MODEL))).toBeVisible();
  await expect(canvasNode(page, targetNodeId(BOUND_MODEL))).toBeVisible();
});

/**
 * Puts the app in dark and leaves a gateway standing for the detail a later step opens.
 *
 * @summary The scheme is settings rather than scenery, so the step writes it the way the settings
 * screen writes it and waits for the window to repaint under it, since everything the scenario
 * goes on to read is painted by that repaint.
 */
Given('the app in the dark scheme', async ({ page }) => {
  await theGatewayAScenarioActsOn(page);

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

/**
 * The seats every card held before the zoom, held to be worth comparing at all.
 *
 * @summary React Flow seats a card in graph space and scales the viewport around it, so a correct
 * zoom leaves every seat untouched. That reads the same as a wrong zoom whenever the only seat is
 * the origin, because scaling fixes the origin. The guard refuses to compare an arrangement that
 * could not have moved, so pointing this scenario back at a bare gateway fails loudly rather than
 * passing quietly.
 */
function anArrangementAZoomCouldMove(page: Page): Record<string, Seat> {
  const seats = viewBeforeTheZoom(page).seats;
  const held = Object.values(seats);

  expect(held.length).toBeGreaterThan(1);
  expect(held.some((seat) => seat.x !== 0 || seat.y !== 0)).toBe(true);

  return seats;
}

Then('the nodes keep their arrangement', async ({ page }) => {
  expect(await nodeSeats(page)).toEqual(anArrangementAZoomCouldMove(page));
});

Then('the minimap and the zoom controls draw in the dark scheme', async ({ page }) => {
  expect(await schemeBehind(minimap(page))).toBe('dark');
  expect(await schemeBehind(canvasTool(page, 'Reset zoom'))).toBe('dark');
});
