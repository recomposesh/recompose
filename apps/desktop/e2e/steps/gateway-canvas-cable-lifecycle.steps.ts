import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { modelAliasFromName } from '@recompose/contracts';

import { dragCableOnto, fitCanvasToView } from '../canvas-gestures';
import { rememberVirtualModel, virtualModelInFocus } from '../canvas-memory';
import { accountPicker, pickProviderModel } from '../canvas-picker';
import {
  cableGrabEnd,
  cableId,
  canvasCable,
  canvasNode,
  confirmRemoval,
  DRAFT_NODE,
  ghostNodeId,
  modelNodeId,
  nodeTreatment,
  openGatewayCanvas,
  removalConfirmation,
  sourcePort,
  standingNodes,
  storedBinding,
  targetNodeId,
  targetPort,
} from '../canvas-screen';
import { Given, Then, When } from '../fixtures';
import { storedGateway } from '../gateway-screen';
import { focusedGateway } from '../scenario-memory';
import {
  accountHeldAs,
  gatewayInFocusOrTargetingAKey,
  gatewayTargetingAKey,
} from '../stored-target-accounts';
import { bindingOf, seedVirtualModels } from '../stored-virtual-models';
import { connectSubscription } from '../subscription-sign-in';

/** The real model the stored Anthropic key account serves, which every binding here names. */
const SERVED_MODEL = 'claude-sonnet-5';

/** The definition that stands an account on the canvas, since only a binding seats a target card. */
const COMPANION = 'steady';

/** The inspector while one subject holds it, which reads under that subject's own heading. */
function inspectorOn(page: Page, heading: string): Locator {
  return page
    .locator('aside')
    .filter({ has: page.getByRole('heading', { exact: true, level: 2, name: heading }) });
}

/** What one definition answers through on disk, which every gesture here writes toward. */
async function boundAccountOf(page: Page, name: string): Promise<string | undefined> {
  return (await storedBinding(page, focusedGateway(page), modelAliasFromName(name)))?.accountId;
}

/** A gateway serving one name through the stored Anthropic key account, open on its canvas. */
async function standsBoundToTheKey(page: Page, name: string, providerModel: string): Promise<void> {
  await gatewayTargetingAKey(page);

  const key = await accountHeldAs(page, 'api-key');

  await seedVirtualModels(page, focusedGateway(page), [
    bindingOf(modelAliasFromName(name), key.id, providerModel),
  ]);
  await openGatewayCanvas(page, focusedGateway(page));
  rememberVirtualModel(page, name);
}

/** Presses a standing cable, which is how a person puts the inspector on the binding it carries. */
async function theCableStandsSelected(page: Page, name: string): Promise<void> {
  await fitCanvasToView(page);
  await canvasCable(page, cableId(modelAliasFromName(name))).click();
  await expect(inspectorOn(page, name)).toContainText('Binding');
}

/** Steers one end of a cable onto the stored key account and answers the model pick it opens. */
async function cableLandsOnTheKeyAccount(page: Page, dragged: Locator): Promise<void> {
  await fitCanvasToView(page);
  await dragCableOnto(page, dragged, targetPort(page, targetNodeId(COMPANION)));
  await pickProviderModel(page, SERVED_MODEL);
}

Given(
  'a virtual model {string} bound to an Anthropic key account serving {string}',
  async ({ page }, name: string, providerModel: string) => {
    await standsBoundToTheKey(page, name, providerModel);
  },
);

Given('a virtual model {string} bound to a key account', async ({ page }, name: string) => {
  await standsBoundToTheKey(page, name, SERVED_MODEL);
});

Given(
  'a virtual model {string} bound to a subscription account',
  async ({ page, subscriptionTools }, name: string) => {
    await gatewayTargetingAKey(page);
    await connectSubscription(page, subscriptionTools, 'anthropic');

    const plan = await accountHeldAs(page, 'subscription');

    await seedVirtualModels(page, focusedGateway(page), [
      bindingOf(modelAliasFromName(name), plan.id, SERVED_MODEL),
    ]);
    await openGatewayCanvas(page, focusedGateway(page));
    rememberVirtualModel(page, name);
  },
);

/** Only a binding seats a target card, so the account arrives behind a companion definition. */
Given('a stored key account standing as a target node', async ({ page }) => {
  const gateway = await gatewayInFocusOrTargetingAKey(page);
  const key = await accountHeldAs(page, 'api-key');
  const held = (await storedGateway(page, gateway)).virtualModels;

  await seedVirtualModels(page, gateway, [...held, bindingOf(COMPANION, key.id, SERVED_MODEL)]);
  await openGatewayCanvas(page, gateway);
  await expect(canvasNode(page, targetNodeId(COMPANION))).toBeVisible();
});

Given('the cable of a virtual model {string} selected', async ({ page }, name: string) => {
  await standsBoundToTheKey(page, name, SERVED_MODEL);
  await theCableStandsSelected(page, name);
});

Given('a virtual model node {string} selected', async ({ page }, name: string) => {
  await standsBoundToTheKey(page, name, SERVED_MODEL);
  await canvasNode(page, modelNodeId(modelAliasFromName(name))).click();

  await expect(inspectorOn(page, name)).toContainText('Virtual model');
});

Given(
  'the confirmation open for deleting the virtual model {string}',
  async ({ page }, name: string) => {
    await standsBoundToTheKey(page, name, SERVED_MODEL);
    await canvasNode(page, modelNodeId(modelAliasFromName(name))).click();
    await page.keyboard.press('Delete');

    await expect(removalConfirmation(page, name)).toBeVisible();
  },
);

When('the person selects the cable between them', async ({ page }) => {
  await theCableStandsSelected(page, virtualModelInFocus(page));
});

When(
  'the person drags the endpoint of the cable from {string} onto the key account node',
  async ({ page }, name: string) => {
    await cableLandsOnTheKeyAccount(
      page,
      cableGrabEnd(page, cableId(modelAliasFromName(name)), 'target'),
    );
  },
);

When(
  'the person tries to pull a new cable from the port of {string}',
  async ({ page }, name: string) => {
    await fitCanvasToView(page);

    const port = sourcePort(page, modelNodeId(modelAliasFromName(name)));
    const grip = await port.boundingBox();

    if (grip === null) {
      throw new Error(`the port of "${name}" stands nowhere a pointer can reach`);
    }

    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(grip.x + grip.width / 2 + 60, grip.y + grip.height / 2 + 40);
    await page.mouse.move(grip.x + grip.width / 2 + 120, grip.y + grip.height / 2 + 90);
  },
);

Then('no cable leaves the port', async ({ page }) => {
  await expect(page.locator('.react-flow__connectionline')).toHaveCount(0);
  await page.mouse.up();
  await expect(accountPicker(page)).toBeHidden();
});

Then('{string} stays bound to the subscription account', async ({ page }, name: string) => {
  const plan = await accountHeldAs(page, 'subscription');

  await expect.poll(async () => boundAccountOf(page, name)).toBe(plan.id);
});

When(
  'the person drags the endpoint of the broken cable onto the key account node',
  async ({ page }) => {
    const broken = cableId(modelAliasFromName(virtualModelInFocus(page)));

    await cableLandsOnTheKeyAccount(page, cableGrabEnd(page, broken, 'target'));
  },
);

When('the person presses Delete', async ({ page }) => {
  await page.keyboard.press('Delete');
});

When('the person confirms', async ({ page }) => {
  await confirmRemoval(page, virtualModelInFocus(page));
});

Then(
  'the inspector reads the account and its model {string}',
  async ({ page }, providerModel: string) => {
    const inspector = inspectorOn(page, virtualModelInFocus(page));

    await expect(inspector).toContainText('API key');
    await expect(inspector).toContainText('Anthropic');
    await expect(inspector).toContainText(providerModel);
  },
);

Then('{string} stands bound to the key account', async ({ page }, name: string) => {
  const key = await accountHeldAs(page, 'api-key');

  await expect.poll(async () => boundAccountOf(page, name)).toBe(key.id);
});

Then('no cable runs from {string} to the subscription account', async ({ page }, name: string) => {
  const plan = await accountHeldAs(page, 'subscription');

  await expect.poll(async () => boundAccountOf(page, name)).not.toBe(plan.id);
});

Then('the old cable falls', async ({ page }) => {
  const alias = modelAliasFromName(virtualModelInFocus(page));

  await expect.poll(async () => standingNodes(page)).not.toContain(ghostNodeId(alias));
  await expect(canvasCable(page, cableId(alias))).toHaveCount(1);
});

Then('the binding is removed with no confirmation asked', async ({ page }) => {
  const name = virtualModelInFocus(page);

  await expect.poll(async () => boundAccountOf(page, name)).toBeUndefined();
  await expect(removalConfirmation(page, name)).toBeHidden();
});

Then('{string} stands on the canvas holding no target', async ({ page }, name: string) => {
  await expect.poll(async () => standingNodes(page)).toContain(DRAFT_NODE);
  expect(await nodeTreatment(page, DRAFT_NODE)).toBe('draft-model');
  await expect(canvasNode(page, DRAFT_NODE)).toContainText(name);
});

Then('a confirmation asks before anything is removed', async ({ page }) => {
  const name = virtualModelInFocus(page);

  await expect(removalConfirmation(page, name)).toBeVisible();
  expect(await boundAccountOf(page, name)).toBeDefined();
  expect(await standingNodes(page)).toContain(modelNodeId(modelAliasFromName(name)));
});

Then('the node {string} leaves the canvas', async ({ page }, name: string) => {
  await expect
    .poll(async () => standingNodes(page))
    .not.toContain(modelNodeId(modelAliasFromName(name)));
});

Then('the gateway holds no definition named {string}', async ({ page }, name: string) => {
  const { virtualModels } = await storedGateway(page, focusedGateway(page));

  expect(virtualModels.map((model) => model.id)).not.toContain(modelAliasFromName(name));
});
