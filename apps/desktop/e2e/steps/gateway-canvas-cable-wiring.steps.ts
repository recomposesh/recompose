import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { modelAliasFromName } from '@recompose/contracts';

import {
  dragCableOnto,
  dropCableAt,
  emptyCanvasSpot,
  fitCanvasToView,
  pullCableTo,
  releaseCable,
  takeUpThePortAsk,
} from '../canvas-gestures';
import {
  anchoredUnder,
  composition,
  compositionBefore,
  letGoOfAnyCableInFlight,
  rememberCableInFlight,
  rememberComposition,
  rememberDropPoint,
  rememberPendingSeat,
  rememberVirtualModel,
  standsAt,
  theDropPoint,
  thePendingSeat,
  virtualModelInFocus,
} from '../canvas-memory';
import {
  accountPicker,
  cableBetween,
  wireBetween,
  cableId,
  cablePath,
  canvasNode,
  completeThePick,
  DRAFT_CABLE,
  DRAFT_NODE,
  GATEWAY_NODE,
  modelNodeId,
  nodeSeat,
  nodeTreatment,
  openGatewayCanvas,
  PENDING_NODE,
  pickProviderModel,
  sourcePort,
  standingCables,
  standingNodes,
  storedBinding,
  targetNodeId,
  targetPort,
} from '../canvas-screen';
import { Given, Then, When } from '../fixtures';
import { draftNameField } from '../gateway-drawer';
import { seedGateway, storedGateway } from '../gateway-screen';
import { focusGateway, focusedGateway } from '../scenario-memory';
import {
  accountHeldAs,
  GATEWAY_A_SCENARIO_ACTS_ON,
  gatewayTargetingAKey,
  KEY_ACCOUNT,
} from '../stored-target-accounts';
import { bindingOf, offerVirtualModels } from '../stored-virtual-models';

/** The real model the stored Anthropic key account serves, which every binding here names. */
const SERVED_MODEL = 'claude-sonnet-5';

/** The definition that stands an account on the canvas, since only a binding seats a target card. */
const COMPANION = 'steady';

/** The card a name stands as: the stored definition, or the draft while it holds no target yet. */
async function cardNamed(page: Page, name: string): Promise<string> {
  const standing = await standingNodes(page);
  const stored = modelNodeId(modelAliasFromName(name));

  rememberVirtualModel(page, name);

  if (standing.includes(stored)) {
    return stored;
  }

  if (standing.includes(DRAFT_NODE)) {
    return DRAFT_NODE;
  }

  throw new Error(`no card on the canvas stands for the virtual model "${name}"`);
}

/** Stands a definition a person began and left unbound, the one shape holding no target at all. */
async function draftNamed(page: Page, name: string): Promise<void> {
  await openGatewayCanvas(page, focusedGateway(page));
  await takeUpThePortAsk(page, GATEWAY_NODE);
  await expect(draftNameField(page)).toBeVisible();
  await draftNameField(page).fill(name);
  rememberVirtualModel(page, name);

  await expect.poll(async () => standingNodes(page)).toContain(DRAFT_NODE);
  expect(await nodeTreatment(page, DRAFT_NODE)).toBe('draft-model');
}

async function letGoOnEmptyCanvas(page: Page, nodeId: string): Promise<void> {
  const spot = await emptyCanvasSpot(page);

  await dropCableAt(page, sourcePort(page, nodeId), spot);
  rememberDropPoint(page, spot);
}

async function standsBoundToTheKeyAccount(page: Page, name: string): Promise<void> {
  const key = await accountHeldAs(page, 'api-key');
  const alias = modelAliasFromName(name);

  rememberVirtualModel(page, name);

  await expect
    .poll(async () => (await storedBinding(page, focusedGateway(page), alias))?.accountId)
    .toBe(key.id);
}

Given('an open gateway detail', async ({ page }) => {
  await seedGateway(page, GATEWAY_A_SCENARIO_ACTS_ON);
  focusGateway(page, GATEWAY_A_SCENARIO_ACTS_ON);

  await openGatewayCanvas(page, GATEWAY_A_SCENARIO_ACTS_ON);
});

Given('a virtual model {string} holding no target', async ({ page }, name: string) => {
  await gatewayTargetingAKey(page);
  await draftNamed(page, name);
});

/**
 * Seats the stored key account on the canvas, which one binding onto it is what does.
 *
 * @summary Only a binding seats a target card, so the account arrives behind a companion
 * definition rather than on its own. The screen reads a gateway once and never hears about a write
 * it did not make, so the arrangement reloads it, and a draft standing from an earlier step is
 * stood again after the reload, because a draft lives beside the tree rather than on disk.
 */
Given('a stored Anthropic key account standing as a target node', async ({ page }) => {
  const gateway = focusedGateway(page);
  const key = await accountHeldAs(page, 'api-key');
  const held = (await storedGateway(page, gateway)).virtualModels;
  const drafted = (await standingNodes(page)).includes(DRAFT_NODE);
  const outcome = await offerVirtualModels(page, gateway, [
    ...held,
    bindingOf(COMPANION, key.id, SERVED_MODEL),
  ]);

  if (!outcome.ok) {
    throw new Error(`the app seated no target for the stored key account: ${outcome.message}`);
  }

  await page.reload();

  if (drafted) {
    await draftNamed(page, virtualModelInFocus(page));
  } else {
    await openGatewayCanvas(page, gateway);
  }

  await expect(canvasNode(page, targetNodeId(COMPANION))).toBeVisible();
});

Given(
  'the picker open from a cable dragged out of {string} and dropped on empty canvas',
  async ({ page }, name: string) => {
    await gatewayTargetingAKey(page);
    await draftNamed(page, name);
    await letGoOnEmptyCanvas(page, DRAFT_NODE);

    await expect(accountPicker(page)).toBeVisible();
    await expect.poll(async () => standingNodes(page)).toContain(PENDING_NODE);
    rememberPendingSeat(page, await nodeSeat(page, PENDING_NODE));
  },
);

Given('a cable drag in flight from the port of {string}', async ({ page }, name: string) => {
  await gatewayTargetingAKey(page);
  await draftNamed(page, name);
  await rememberComposition(page);

  await pullCableTo(page, sourcePort(page, DRAFT_NODE), await emptyCanvasSpot(page));
  rememberCableInFlight(page);
});

When(
  'the person drags a cable from the port of {string} onto the target node and picks the provider model {string}',
  async ({ page }, name: string, providerModel: string) => {
    const from = await cardNamed(page, name);

    await fitCanvasToView(page);
    await dragCableOnto(page, sourcePort(page, from), targetPort(page, targetNodeId(COMPANION)));
    await pickProviderModel(page, providerModel);
  },
);

When(
  'the person drags a cable from the port of {string} and drops it on empty canvas',
  async ({ page }, name: string) => {
    await letGoOnEmptyCanvas(page, await cardNamed(page, name));
  },
);

When(
  "the person drags a cable from the gateway's port and drops it on empty canvas",
  async ({ page }) => {
    await letGoOnEmptyCanvas(page, GATEWAY_NODE);
  },
);

When(
  'the person picks the stored Anthropic key account and the provider model {string}',
  async ({ page }, providerModel: string) => {
    await completeThePick(page, KEY_ACCOUNT, providerModel);
  },
);

When('the person presses Esc', async ({ page }) => {
  await page.keyboard.press('Escape');

  if (letGoOfAnyCableInFlight(page)) {
    await releaseCable(page);
  }
});

Then('{string} stands bound to that account', async ({ page }, name: string) => {
  await standsBoundToTheKeyAccount(page, name);
});

Then('{string} stands bound to it', async ({ page }, name: string) => {
  await standsBoundToTheKeyAccount(page, name);
});

Then('the canvas draws the new cable', async ({ page }) => {
  const alias = modelAliasFromName(virtualModelInFocus(page));

  await expect.poll(async () => standingCables(page)).toContain(cableId(alias));
  await expect(cableBetween(page, modelNodeId(alias), targetNodeId(alias))).toHaveCount(1);
  expect(await cablePath(page, cableId(alias))).not.toBe('');
});

Then('the picker of stored accounts opens', async ({ page }) => {
  await expect(accountPicker(page)).toBeVisible();
});

Then('it anchors to a pending target card at the drop point', async ({ page }) => {
  await expect.poll(async () => standingNodes(page)).toContain(PENDING_NODE);
  await standsAt(canvasNode(page, PENDING_NODE), theDropPoint(page));
  await anchoredUnder(accountPicker(page), canvasNode(page, PENDING_NODE));
});

Then('the account stands as a target node at the drop point', async ({ page }) => {
  const alias = modelAliasFromName(virtualModelInFocus(page));

  await expect.poll(async () => standingNodes(page)).toContain(targetNodeId(alias));
  expect(await nodeSeat(page, targetNodeId(alias))).toEqual(thePendingSeat(page));
});

Then('the picker closes and the pending card leaves the canvas', async ({ page }) => {
  await expect(accountPicker(page)).toBeHidden();
  await expect.poll(async () => standingNodes(page)).not.toContain(PENDING_NODE);
});

Then('{string} still holds no target', async ({ page }, name: string) => {
  const alias = modelAliasFromName(name);

  expect(await storedBinding(page, focusedGateway(page), alias)).toBeUndefined();
  expect(await nodeTreatment(page, DRAFT_NODE)).toBe('draft-model');
});

Then('the drag cancels', async ({ page }) => {
  await expect(accountPicker(page)).toBeHidden();
  expect(await standingNodes(page)).not.toContain(PENDING_NODE);
});

Then('the composition stands unchanged', async ({ page }) => {
  await expect.poll(async () => composition(page)).toEqual(compositionBefore(page));
});

Then(
  'a draft virtual model node stands wired to the gateway at the drop point',
  async ({ page }) => {
    await expect.poll(async () => standingNodes(page)).toContain(DRAFT_NODE);
    expect(await nodeTreatment(page, DRAFT_NODE)).toBe('draft-model');

    await expect.poll(async () => standingCables(page)).toContain(DRAFT_CABLE);
    await expect(wireBetween(page, GATEWAY_NODE, DRAFT_NODE)).toHaveCount(1);
    await standsAt(canvasNode(page, DRAFT_NODE), theDropPoint(page));
  },
);

Then('the inspector opens with the name field focused', async ({ page }) => {
  await expect(draftNameField(page)).toBeFocused();
});
