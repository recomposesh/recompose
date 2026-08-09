import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { modelAliasFromName } from '@recompose/contracts';

import { dragCableOnto, fitCanvasToView } from '../canvas-gestures';
import { rememberVirtualModel, virtualModelInFocus } from '../canvas-memory';
import {
  cableBetween,
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
  pickProviderModel,
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

/** An account id no registry holds, which is what leaves a binding standing on a ghost. */
const GONE = 'nowhere';

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
  const key = await accountHeldAs(page, 'api-key');

  await fitCanvasToView(page);
  await dragCableOnto(page, dragged, targetPort(page, targetNodeId(key.id)));
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
  await expect(canvasNode(page, targetNodeId(key.id))).toBeVisible();
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

Given('the cable of {string} ending on a ghost node', async ({ page }, name: string) => {
  await gatewayTargetingAKey(page);
  await seedVirtualModels(page, focusedGateway(page), [
    bindingOf(modelAliasFromName(name), GONE, SERVED_MODEL),
  ]);
  await openGatewayCanvas(page, focusedGateway(page));
  rememberVirtualModel(page, name);

  await expect(canvasNode(page, ghostNodeId(GONE))).toBeVisible();
});

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
  'the person drags a new cable from the port of {string} onto the key account node',
  async ({ page }, name: string) => {
    await cableLandsOnTheKeyAccount(page, sourcePort(page, modelNodeId(modelAliasFromName(name))));
  },
);

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

When('that account is removed from the stored accounts', async ({ page }) => {
  const key = await accountHeldAs(page, 'api-key');
  const answer = await page.evaluate(
    async (id) => window.recompose['accounts:remove']({ id }),
    key.id,
  );

  if (!answer.ok) {
    throw new Error(`the app removed no account: ${answer.error.message}`);
  }
});

Then(
  'the inspector reads the account and its model {string}',
  async ({ page }, providerModel: string) => {
    const key = await accountHeldAs(page, 'api-key');
    const inspector = inspectorOn(page, virtualModelInFocus(page));

    await expect(inspector).toContainText(key.label);
    await expect(inspector).toContainText(providerModel);
  },
);

Then('{string} stands bound to the key account', async ({ page }, name: string) => {
  const key = await accountHeldAs(page, 'api-key');

  await expect.poll(async () => boundAccountOf(page, name)).toBe(key.id);
});

Then('no cable runs from {string} to the subscription account', async ({ page }, name: string) => {
  const plan = await accountHeldAs(page, 'subscription');

  await expect(
    cableBetween(page, modelNodeId(modelAliasFromName(name)), targetNodeId(plan.id)),
  ).toHaveCount(0);
});

Then('the old cable falls', async ({ page }) => {
  const plan = await accountHeldAs(page, 'subscription');
  const alias = modelAliasFromName(virtualModelInFocus(page));

  await expect.poll(async () => standingNodes(page)).not.toContain(targetNodeId(plan.id));
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

Then(
  'the cable of {string} holds, ending on a ghost node marked as removed',
  async ({ page }, name: string) => {
    const alias = modelAliasFromName(name);
    const held = await storedBinding(page, focusedGateway(page), alias);

    if (held === undefined) {
      throw new Error(`the gateway let go of the binding of "${name}" instead of holding it`);
    }

    const ghost = ghostNodeId(held.accountId);

    await expect.poll(async () => standingNodes(page)).toContain(ghost);
    expect(await nodeTreatment(page, ghost)).toBe('ghost-target');
    await expect(cableBetween(page, modelNodeId(alias), ghost)).toHaveCount(1);
    await expect(canvasNode(page, ghost)).toContainText('Removed');
  },
);

Then('the ghost node leaves the canvas', async ({ page }) => {
  await expect.poll(async () => standingNodes(page)).not.toContain(ghostNodeId(GONE));
});
