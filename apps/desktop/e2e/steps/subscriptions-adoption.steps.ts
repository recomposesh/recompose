import { expect } from '@playwright/test';

import { takeUpThePortAsk } from '../canvas-gestures';
import { accountPicker, pickTheTargetKind } from '../canvas-picker';
import { DRAFT_NODE, GATEWAY_NODE, openGatewayCanvas } from '../canvas-screen';
import { Then, When } from '../fixtures';
import { catalog } from '../provider-screen';
import { focusedGateway } from '../scenario-memory';
import { accountHeldAs, gatewayTargetingAKey } from '../stored-target-accounts';
import { SIGN_IN_WAIT_MS } from '../subscription-sign-in';
import { adoptWhatTheMachineHolds, machineLoginHeld } from './machine-subscriptions';

/** What one stored-account flow may spend on a runner already bringing up two applications. */
const ONE_FLOW_MS = 10_000;

/** The gateway seed and the key it targets, standing beside the adoption this file arranges. */
const FLOWS_BESIDE_THE_ADOPTION = 2;

When('the maintainer connects the account the machine holds', async ({ page }) => {
  await adoptWhatTheMachineHolds(page, machineLoginHeld(page).provider);
});

Then('signing in with a different account stays available', async ({ page }) => {
  await expect(
    catalog(page).getByRole('button', { name: 'Sign in with a different account' }),
  ).toBeEnabled();
});

Then(
  "the account stands among a virtual model's target choices like any other",
  async ({ $testInfo, page }) => {
    $testInfo.setTimeout(SIGN_IN_WAIT_MS + FLOWS_BESIDE_THE_ADOPTION * ONE_FLOW_MS);
    await gatewayTargetingAKey(page);

    const plan = await accountHeldAs(page, 'subscription');

    await openGatewayCanvas(page, focusedGateway(page));
    await takeUpThePortAsk(page, GATEWAY_NODE);
    await takeUpThePortAsk(page, DRAFT_NODE);
    await pickTheTargetKind(page);
    await expect(accountPicker(page).getByRole('button', { name: plan.label })).toBeVisible();
  },
);
