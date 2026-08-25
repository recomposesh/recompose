import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { modelIdFromName } from '@recompose/contracts';

import type { Seat } from '../canvas-screen';

import { takeUpThePortAsk } from '../canvas-gestures';
import { emptyCanvasSpot } from '../canvas-room';
import {
  canvasNode,
  DRAFT_NODE,
  GATEWAY_NODE,
  modelNodeId,
  nodeSeat,
  nodeTreatment,
  openGatewayCanvas,
  standingNodes,
  wireBetween,
} from '../canvas-screen';
import { Given, Then, When } from '../fixtures';
import {
  draftInspector,
  draftNameField,
  inspectorModelOption,
  pickTargetInInspector,
} from '../gateway-drawer';
import { focusedGateway } from '../scenario-memory';
import {
  gatewayTargetingAKey,
  KEY_ACCOUNT,
  theGatewayAScenarioActsOn,
} from '../stored-target-accounts';

/** What the inspector's own foot offers, which is the press that settles a draft into a model. */
const SETTLE_THE_DEFINITION = 'Add virtual model';

/** The screen a person leaves the gateway detail for, which composes nothing of its own. */
const A_SCREEN_ELSEWHERE = 'Settings';

const draftSeatsBeforeLeaving = new WeakMap<Page, Seat>();

/** Where the draft stood before the person went elsewhere, which returning is read against. */
function theDraftSeatBeforeLeaving(page: Page): Seat {
  const seat = draftSeatsBeforeLeaving.get(page);

  if (seat === undefined) {
    throw new Error('no step in this scenario read where the draft stood');
  }

  return seat;
}

/** The name a card carries, read off the tooltip it holds the whole of that name in. */
function cardNaming(page: Page, nodeId: string, name: string): Locator {
  return canvasNode(page, nodeId).getByTitle(name, { exact: true });
}

/** Stands a draft from the gateway's own ask, which is the one way a keyboard starts one. */
async function draftFromTheGatewayPlus(page: Page): Promise<void> {
  await openGatewayCanvas(page, focusedGateway(page));
  await takeUpThePortAsk(page, GATEWAY_NODE);
  await expect(draftNameField(page)).toBeVisible();
  await expect.poll(async () => standingNodes(page)).toContain(DRAFT_NODE);
}

Given("a draft virtual model node born from the gateway's plus", async ({ page }) => {
  await theGatewayAScenarioActsOn(page);
  await draftFromTheGatewayPlus(page);
});

Given(
  'a draft virtual model holding the partial name {string}',
  async ({ page }, partial: string) => {
    await theGatewayAScenarioActsOn(page);
    await draftFromTheGatewayPlus(page);
    await draftNameField(page).fill(partial);

    await expect(cardNaming(page, DRAFT_NODE, partial)).toBeVisible();
    draftSeatsBeforeLeaving.set(page, await nodeSeat(page, DRAFT_NODE));
  },
);

Given('a draft virtual model node wired to the gateway', async ({ page }) => {
  await gatewayTargetingAKey(page);
  await draftFromTheGatewayPlus(page);

  await expect(wireBetween(page, GATEWAY_NODE, DRAFT_NODE)).toHaveCount(1);
});

When('the person deselects it', async ({ page }) => {
  const standingSelected = canvasNode(page, DRAFT_NODE).getByRole('button', { pressed: true });
  const spot = await emptyCanvasSpot(page);

  await expect(standingSelected).toBeVisible();
  await page.mouse.click(spot.x, spot.y);
  await expect(standingSelected).toHaveCount(0);
});

When('the person leaves the gateway detail and returns', async ({ page }) => {
  await page.getByRole('link', { exact: true, name: A_SCREEN_ELSEWHERE }).click();

  await expect(canvasNode(page, GATEWAY_NODE)).toBeHidden();
  await openGatewayCanvas(page, focusedGateway(page));
});

When(
  'the person completes the definition, naming {string} over the provider model {string}',
  async ({ page }, name: string, providerModel: string) => {
    await draftNameField(page).fill(name);
    await pickTargetInInspector(page, KEY_ACCOUNT);
    await inspectorModelOption(page, providerModel).click();
    await draftInspector(page)
      .getByRole('button', { exact: true, name: SETTLE_THE_DEFINITION })
      .click();
  },
);

Then('the draft stays on the canvas in its draft treatment', async ({ page }) => {
  await expect(canvasNode(page, DRAFT_NODE)).toBeVisible();
  expect(await nodeTreatment(page, DRAFT_NODE)).toBe('draft-model');
});

Then('the draft stands where it was, still holding {string}', async ({ page }, partial: string) => {
  await expect(canvasNode(page, DRAFT_NODE)).toBeVisible();
  await expect(cardNaming(page, DRAFT_NODE, partial)).toBeVisible();
  expect(await nodeSeat(page, DRAFT_NODE)).toEqual(theDraftSeatBeforeLeaving(page));
});

Then(
  '{string} stands as a virtual model node in the regular treatment',
  async ({ page }, name: string) => {
    const stood = modelNodeId(modelIdFromName(name));

    await expect.poll(async () => standingNodes(page)).toContain(stood);
    expect(await nodeTreatment(page, stood)).toBe('virtual-model');
    expect(await standingNodes(page)).not.toContain(DRAFT_NODE);
  },
);
