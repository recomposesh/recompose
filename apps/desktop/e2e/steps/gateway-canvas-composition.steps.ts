import { expect } from '@playwright/test';

import {
  cableBetween,
  canvasNode,
  GATEWAY_NODE,
  ghostNodeId,
  modelNodeId,
  openGatewayCanvas,
  standingNodes,
  targetNodeId,
  wireBetween,
} from '../canvas-screen';
import { Given, Then, When } from '../fixtures';
import { focusedGateway } from '../scenario-memory';
import { accountHeldAs, gatewayTargetingAKey } from '../stored-target-accounts';
import { bindingOf, seedVirtualModels } from '../stored-virtual-models';

const MODEL_THE_KEY_ACCOUNT_SERVES = 'claude-sonnet-5';

Given(
  'a gateway holding a virtual model {string} bound to an Anthropic key account',
  async ({ page }, name: string) => {
    await gatewayTargetingAKey(page);

    const key = await accountHeldAs(page, 'api-key');

    await seedVirtualModels(page, focusedGateway(page), [
      bindingOf(name, key.id, MODEL_THE_KEY_ACCOUNT_SERVES),
    ]);
  },
);

Given('a stored key account no virtual model targets', async ({ page }) => {
  await gatewayTargetingAKey(page);
});

When('the person opens the gateway detail', async ({ page }) => {
  await openGatewayCanvas(page, focusedGateway(page));
});

Then(
  'the canvas shows the gateway, {string}, and the account as nodes',
  async ({ page }, name: string) => {
    const key = await accountHeldAs(page, 'api-key');

    await expect(canvasNode(page, GATEWAY_NODE)).toBeVisible();
    await expect(canvasNode(page, modelNodeId(name))).toBeVisible();
    await expect(canvasNode(page, targetNodeId(key.id))).toBeVisible();
  },
);

Then(
  'cables join the gateway to {string} and {string} to the account',
  async ({ page }, wiredToTheGateway: string, cabledToTheAccount: string) => {
    const key = await accountHeldAs(page, 'api-key');

    await expect(wireBetween(page, GATEWAY_NODE, modelNodeId(wiredToTheGateway))).toHaveCount(1);
    await expect(
      cableBetween(page, modelNodeId(cabledToTheAccount), targetNodeId(key.id)),
    ).toHaveCount(1);
  },
);

Then('no node stands for that account', async ({ page }) => {
  const key = await accountHeldAs(page, 'api-key');
  const standing = await standingNodes(page);

  expect(standing).not.toContain(targetNodeId(key.id));
  expect(standing).not.toContain(ghostNodeId(key.id));
});
