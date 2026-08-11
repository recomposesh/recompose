import { expect } from '@playwright/test';
import { modelAliasFromName } from '@recompose/contracts';

import { rememberVirtualModel, virtualModelInFocus } from '../canvas-memory';
import {
  cableBetween,
  canvasNode,
  ghostNodeId,
  modelNodeId,
  nodeTreatment,
  openGatewayCanvas,
  standingNodes,
  storedBinding,
} from '../canvas-screen';
import { Given, Then, When } from '../fixtures';
import { focusedGateway } from '../scenario-memory';
import { accountHeldAs, gatewayTargetingAKey } from '../stored-target-accounts';
import { bindingOf, seedVirtualModels } from '../stored-virtual-models';

const SERVED_MODEL = 'claude-sonnet-5';

const GONE = 'nowhere';

Given('the cable of {string} ending on a ghost node', async ({ page }, name: string) => {
  await gatewayTargetingAKey(page);
  await seedVirtualModels(page, focusedGateway(page), [
    bindingOf(modelAliasFromName(name), GONE, SERVED_MODEL),
  ]);
  await openGatewayCanvas(page, focusedGateway(page));
  rememberVirtualModel(page, name);

  await expect(canvasNode(page, ghostNodeId(modelAliasFromName(name)))).toBeVisible();
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
  'the cable of {string} holds, ending on a ghost node marked as removed',
  async ({ page }, name: string) => {
    const alias = modelAliasFromName(name);
    const held = await storedBinding(page, focusedGateway(page), alias);

    if (held === undefined) {
      throw new Error(`the gateway let go of the binding of "${name}" instead of holding it`);
    }

    const ghost = ghostNodeId(alias);

    await expect.poll(async () => standingNodes(page)).toContain(ghost);
    expect(await nodeTreatment(page, ghost)).toBe('ghost-target');
    await expect(cableBetween(page, modelNodeId(alias), ghost)).toHaveCount(1);
    await expect(canvasNode(page, ghost)).toContainText('Removed');
  },
);

Then('the ghost node leaves the canvas', async ({ page }) => {
  await expect
    .poll(async () => standingNodes(page))
    .not.toContain(ghostNodeId(modelAliasFromName(virtualModelInFocus(page))));
});
