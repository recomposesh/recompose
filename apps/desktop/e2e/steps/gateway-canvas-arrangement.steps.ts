import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { modelAliasFromName } from '@recompose/contracts';

import type { Seat } from '../canvas-screen';

import { dragCardBy } from '../canvas-gestures';
import { rememberVirtualModel, virtualModelInFocus } from '../canvas-memory';
import {
  cableBetween,
  cableId,
  cablePath,
  canvasNode,
  GATEWAY_NODE,
  modelNodeId,
  nodeSeat,
  nodeSeats,
  openGatewayCanvas,
  storedBinding,
  targetNodeId,
} from '../canvas-screen';
import { Given, Then, When } from '../fixtures';
import { seedGateway } from '../gateway-screen';
import { focusedGateway, focusGateway } from '../scenario-memory';
import { accountHeldAs, gatewayTargetingAKey } from '../stored-target-accounts';
import { bindingOf, seedVirtualModels } from '../stored-virtual-models';

/** The real model the stored Anthropic key account serves, which every binding here names. */
const SERVED_MODEL = 'claude-sonnet-5';

/** The definition the composition here holds wherever a scenario names no virtual model itself. */
const COMPOSED_MODEL = 'fast';

/** How far a card travels, in window pixels, which carries it clear of the seat it started in. */
const ACROSS_THE_CANVAS = { x: 90, y: 70 };

/** What the toolbar offers for asking the automatic arrangement back. */
const TIDY_THE_CANVAS = 'Tidy the canvas';

/** Where every card stood before anybody dragged one, which is the arrangement the canvas laid out. */
const automaticArrangements = new WeakMap<Page, Record<string, Seat>>();

const seatsDraggedTo = new WeakMap<Page, Seat>();

const linesBeforeADrag = new WeakMap<Page, string>();

function theAutomaticArrangement(page: Page): Record<string, Seat> {
  const laid = automaticArrangements.get(page);

  if (laid === undefined) {
    throw new Error('no step in this scenario read the arrangement the canvas laid out');
  }

  return laid;
}

/** The spot a card was dragged to, which returning and leaving alone are both read against. */
function theSpotDraggedTo(page: Page): Seat {
  const seat = seatsDraggedTo.get(page);

  if (seat === undefined) {
    throw new Error('no step in this scenario dragged a card anywhere');
  }

  return seat;
}

/**
 * The line a cable draws right now, waited for rather than read the instant a card stands.
 *
 * @operation Cables paint a beat after the cards they join, so a bare read taken as the scenario
 * starts answers a cable that has drawn nothing yet, and every later line would then read as a
 * change from that nothing whether the cable followed the node or not.
 */
async function theLineDrawnBy(page: Page, cable: string): Promise<string> {
  await expect.poll(async () => cablePath(page, cable)).not.toBe('');

  return cablePath(page, cable);
}

/** The line the cable drew before the drag, which following the node has to have redrawn. */
function theLineBeforeTheDrag(page: Page): string {
  const drawn = linesBeforeADrag.get(page);

  if (drawn === undefined) {
    throw new Error('no step in this scenario read the line the cable drew');
  }

  return drawn;
}

/** Puts one binding onto a stored gateway, which is what seats a model card and a target card. */
async function composedOnto(page: Page, gateway: string, name: string): Promise<void> {
  const key = await accountHeldAs(page, 'api-key');

  await seedVirtualModels(page, gateway, [
    bindingOf(modelAliasFromName(name), key.id, SERVED_MODEL),
  ]);
}

/**
 * Opens a composition and reads the arrangement the canvas laid out for it.
 *
 * @summary Every scenario here is about a seat moving, so the reading is taken once every card of
 * the composition stands rather than as soon as the gateway does, because an arrangement read while
 * a column was still arriving would be a different arrangement from the one Tidy goes back to.
 */
async function theCanvasArrangesItself(page: Page, gateway: string, name: string): Promise<void> {
  await openGatewayCanvas(page, gateway);
  await expect(canvasNode(page, modelNodeId(modelAliasFromName(name)))).toBeVisible();
  await expect(canvasNode(page, targetNodeId(modelAliasFromName(name)))).toBeVisible();
  automaticArrangements.set(page, await nodeSeats(page));
}

/** A gateway serving one binding onto the stored key account, standing open on its canvas. */
async function aBoundCompositionStands(page: Page, name: string): Promise<void> {
  await gatewayTargetingAKey(page);
  await composedOnto(page, focusedGateway(page), name);
  await theCanvasArrangesItself(page, focusedGateway(page), name);
  rememberVirtualModel(page, name);
}

/** Moves a card and waits for it to come to rest elsewhere, which is what a drag amounts to. */
async function draggedAcrossTheCanvas(page: Page, nodeId: string): Promise<Seat> {
  const before = await nodeSeat(page, nodeId);

  await dragCardBy(page, canvasNode(page, nodeId), ACROSS_THE_CANVAS);
  await expect.poll(async () => nodeSeat(page, nodeId)).not.toEqual(before);

  return nodeSeat(page, nodeId);
}

Given(
  'a virtual model {string} bound to an Anthropic key account',
  async ({ page }, name: string) => {
    await aBoundCompositionStands(page, name);
  },
);

Given('the person dragged the node of {string} to a new spot', async ({ page }, name: string) => {
  await aBoundCompositionStands(page, name);
  seatsDraggedTo.set(
    page,
    await draggedAcrossTheCanvas(page, modelNodeId(modelAliasFromName(name))),
  );
});

/**
 * Stands two gateways composed alike, one of them rearranged by hand.
 *
 * @summary Both hold the same binding onto the same account, so the arrangement read off the one
 * before anybody dragged it is the arrangement the other must be standing in: a reading that would
 * be nothing but a guess if the two compositions differed.
 */
Given(
  'a gateway {string} with a dragged arrangement and a gateway {string} left untouched',
  async ({ page }, dragged: string, untouched: string) => {
    await gatewayTargetingAKey(page);

    for (const gateway of [dragged, untouched]) {
      await seedGateway(page, gateway);
      await composedOnto(page, gateway, COMPOSED_MODEL);
    }

    await theCanvasArrangesItself(page, dragged, COMPOSED_MODEL);
    await draggedAcrossTheCanvas(page, modelNodeId(COMPOSED_MODEL));
  },
);

Given('nodes dragged out of the automatic arrangement', async ({ page }) => {
  await aBoundCompositionStands(page, COMPOSED_MODEL);
  await draggedAcrossTheCanvas(page, GATEWAY_NODE);
  await draggedAcrossTheCanvas(page, modelNodeId(COMPOSED_MODEL));
});

When('the person drags the node of {string} across the canvas', async ({ page }, name: string) => {
  const alias = modelAliasFromName(name);

  linesBeforeADrag.set(page, await theLineDrawnBy(page, cableId(alias)));
  seatsDraggedTo.set(page, await draggedAcrossTheCanvas(page, modelNodeId(alias)));
});

When('the person opens the detail of {string}', async ({ page }, name: string) => {
  await openGatewayCanvas(page, name);
  focusGateway(page, name);
});

When('the person invokes Tidy', async ({ page }) => {
  await page.getByRole('button', { exact: true, name: TIDY_THE_CANVAS }).click();
});

Then('{string} still stands bound to that account', async ({ page }, name: string) => {
  const key = await accountHeldAs(page, 'api-key');

  await expect
    .poll(async () => storedBinding(page, focusedGateway(page), modelAliasFromName(name)))
    .toEqual({ accountId: key.id, providerModel: SERVED_MODEL });
});

Then('the cable follows the node', async ({ page }) => {
  const alias = modelAliasFromName(virtualModelInFocus(page));

  await expect(cableBetween(page, modelNodeId(alias), targetNodeId(alias))).toHaveCount(1);
  await expect
    .poll(async () => cablePath(page, cableId(alias)))
    .not.toBe(theLineBeforeTheDrag(page));
});

Then('the node of {string} stands at that spot', async ({ page }, name: string) => {
  await expect
    .poll(async () => nodeSeat(page, modelNodeId(modelAliasFromName(name))))
    .toEqual(theSpotDraggedTo(page));
});

Then('the nodes of {string} stand in the automatic arrangement', async ({ page }, name: string) => {
  await expect(page.getByRole('toolbar', { exact: true, name })).toBeVisible();
  await expect.poll(async () => nodeSeats(page)).toEqual(theAutomaticArrangement(page));
});

Then('every node returns to its automatic place', async ({ page }) => {
  await expect.poll(async () => nodeSeats(page)).toEqual(theAutomaticArrangement(page));
});
