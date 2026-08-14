import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { takeUpThePortAsk } from '../canvas-gestures';
import { completeThePick } from '../canvas-picker';
import { canvasNode, DRAFT_NODE, GATEWAY_NODE, openGatewayCanvas } from '../canvas-screen';
import { Given, Then, When } from '../fixtures';
import {
  draftInspector,
  draftNameField,
  inspectorModelOption,
  inspectorRefusal,
  pickTargetInInspector,
  rowLines,
  servedRow,
  servedRows,
} from '../gateway-drawer';
import { storedGateway } from '../gateway-screen';
import { modelsTheProviderServes } from '../key-probe-stub';
import { focusedGateway } from '../scenario-memory';
import { gatewayTargetingAKey, KEY_ACCOUNT } from '../stored-target-accounts';

/** The two lines a defined row leads with: the name a client asks for, then what serves it. */
const NAME_THEN_BINDING = 2;

async function draftBornFromTheGatewayPlus(page: Page): Promise<void> {
  await openGatewayCanvas(page, focusedGateway(page));
  await takeUpThePortAsk(page, GATEWAY_NODE);
  await expect(draftNameField(page)).toBeVisible();
}

Given('a gateway with a stored Anthropic key account', async ({ page }) => {
  await gatewayTargetingAKey(page);
});

Given(
  'a gateway with a stored Anthropic key account whose model list is reachable',
  async ({ keyProbe, page }) => {
    await gatewayTargetingAKey(page);
    keyProbe.accepts();
  },
);

Given(
  'a gateway with a stored Anthropic key account whose model list is unreachable',
  async ({ keyProbe, page }) => {
    await gatewayTargetingAKey(page);
    keyProbe.cannotBeReached();
  },
);

When(
  "the person defines a virtual model {string} targeting that account's {string}",
  async ({ page }, name: string, providerModel: string) => {
    await draftBornFromTheGatewayPlus(page);
    await draftNameField(page).fill(name);
    await takeUpThePortAsk(page, DRAFT_NODE);
    await completeThePick(page, KEY_ACCOUNT, providerModel);
    await canvasNode(page, GATEWAY_NODE).click();
  },
);

When('the person picks that account as the target for a new virtual model', async ({ page }) => {
  await draftBornFromTheGatewayPlus(page);
  await pickTargetInInspector(page, KEY_ACCOUNT);
});

Then('the Models list holds {string} as one row', async ({ page }, name: string) => {
  const gateway = focusedGateway(page);

  await expect(servedRows(page, gateway)).toHaveCount(1);
  await expect(servedRow(page, gateway, name)).toBeVisible();
});

Then('the row reads {string} over its target', async ({ page }, name: string) => {
  const printed = await rowLines(servedRow(page, focusedGateway(page), name));

  expect(printed.slice(0, NAME_THEN_BINDING)).toEqual([
    name,
    `${name} → ${KEY_ACCOUNT} · claude-sonnet-5`,
  ]);
});

Then("the Model field offers the account's live model list", async ({ page }) => {
  for (const providerModel of modelsTheProviderServes) {
    await expect(inspectorModelOption(page, providerModel)).toBeVisible();
  }
});

Then('the field accepts no free-text model', async ({ page }) => {
  await expect(
    draftInspector(page).getByRole('textbox', { exact: true, name: 'Model' }),
  ).toHaveCount(0);
});

Then('the inspector reads a typed refusal naming the failed look', async ({ page }) => {
  await expect(inspectorRefusal(page)).toHaveText(
    "recompose couldn't read this account's model list.",
  );
});

Then('no definition is stored', async ({ page }) => {
  expect((await storedGateway(page, focusedGateway(page))).virtualModels).toEqual([]);
});
