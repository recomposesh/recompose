import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { takeUpThePortAsk } from '../canvas-gestures';
import {
  cableBetween,
  cablePath,
  DRAFT_CABLE,
  DRAFT_NODE,
  GATEWAY_NODE,
  modelNodeId,
  nodeTreatment,
  openGatewayCanvas,
  portAskOn,
  standingNodes,
} from '../canvas-screen';
import { Given, Then, When } from '../fixtures';
import { seedGateway } from '../gateway-screen';
import { focusedGateway, focusGateway } from '../scenario-memory';
import {
  accountHeldAs,
  GATEWAY_A_SCENARIO_ACTS_ON,
  gatewayTargetingAKey,
} from '../stored-target-accounts';
import { bindingOf, seedVirtualModels } from '../stored-virtual-models';

/** What the gateway's ask offers, which is the sentence a keyboard reads off it. */
const GATEWAY_ASK = 'Add a virtual model';

/** The real model the stored Anthropic key account serves, which the bound definition names. */
const SERVED_MODEL = 'claude-sonnet-5';

/** How many presses a walk may spend before the keyboard is called unable to reach the ask. */
const TAB_LIMIT = 80;

/** How much of itself the ask shows, which is none of it until a keyboard arrives on it. */
async function askPaint(page: Page, nodeId: string): Promise<number> {
  return Number(await portAskOn(page, nodeId).evaluate((ask) => getComputedStyle(ask).opacity));
}

/**
 * Whether a pointer put at the ask's middle would meet the ask rather than what lies under it.
 *
 * @summary The ask lets every pointer event pass through, so the reading comes off the element the
 * document hands back at that spot: an ask a pointer can reach is the standing affordance the
 * canvas retired, and no assertion about what the ask looks like would catch it coming back.
 */
async function askMeetsAPointer(ask: Locator): Promise<boolean> {
  const box = await ask.boundingBox();

  if (box === null) {
    throw new Error('the ask stands nowhere on the canvas at all');
  }

  return ask.evaluate(
    (held, at) => {
      const met = document.elementFromPoint(at.x, at.y);

      return met !== null && held.contains(met);
    },
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
  );
}

/** The card a name stands as, which is its stored definition or the draft still holding its seat. */
async function cardFor(page: Page, name: string): Promise<string> {
  const stored = modelNodeId(name);

  return (await standingNodes(page)).includes(stored) ? stored : DRAFT_NODE;
}

/**
 * Walks the keyboard onto a port's ask, one press at a time, the way a person without a pointer does.
 *
 * @summary The ask paints under keyboard focus alone, so the walk is a real one rather than focus
 * placed from script: arriving by Tab is both what a person does and what proves the port answers a
 * keyboard at all, which is the whole claim the retired plus used to carry with an icon.
 */
async function tabOntoTheAsk(page: Page, nodeId: string): Promise<void> {
  const ask = portAskOn(page, nodeId);

  for (let presses = 0; presses < TAB_LIMIT; presses += 1) {
    if (await ask.evaluate((held) => held === document.activeElement)) {
      return;
    }

    await page.keyboard.press('Tab');
  }

  throw new Error(`no keyboard walk reached the ask on the port of "${nodeId}"`);
}

Given('a gateway with no virtual models defined', async ({ page }) => {
  await seedGateway(page, GATEWAY_A_SCENARIO_ACTS_ON);
  focusGateway(page, GATEWAY_A_SCENARIO_ACTS_ON);
});

Given(
  'a gateway holding a virtual model {string} bound to a target',
  async ({ page }, name: string) => {
    await gatewayTargetingAKey(page);

    const gateway = focusedGateway(page);
    const key = await accountHeldAs(page, 'api-key');

    await seedVirtualModels(page, gateway, [bindingOf(name, key.id, SERVED_MODEL)]);
    await openGatewayCanvas(page, gateway);
  },
);

When("the person moves keyboard focus onto the gateway port's ask", async ({ page }) => {
  await tabOntoTheAsk(page, GATEWAY_NODE);
});

When("the person takes up the gateway port's ask without a drag", async ({ page }) => {
  await takeUpThePortAsk(page, GATEWAY_NODE);
});

When(
  'the person takes up the ask on the port of {string} without a drag',
  async ({ page }, name: string) => {
    await takeUpThePortAsk(page, await cardFor(page, name));
  },
);

Then(
  'the gateway stands as a plain node with no standing affordance beside its port',
  async ({ page }) => {
    expect(await standingNodes(page)).toEqual([GATEWAY_NODE]);
    expect(await nodeTreatment(page, GATEWAY_NODE)).toBe('gateway');
    expect(await askPaint(page, GATEWAY_NODE)).toBe(0);
    expect(await askMeetsAPointer(portAskOn(page, GATEWAY_NODE))).toBe(false);
  },
);

Then('the ask paints and names what it offers', async ({ page }) => {
  await expect.poll(async () => askPaint(page, GATEWAY_NODE)).toBe(1);
  await expect(portAskOn(page, GATEWAY_NODE)).toHaveAccessibleName(GATEWAY_ASK);
});

Then('the ask of {string} stays unpainted', async ({ page }, name: string) => {
  expect(await askPaint(page, await cardFor(page, name))).toBe(0);
});

Then('a draft virtual model node stands wired to the gateway', async ({ page }) => {
  await expect.poll(async () => standingNodes(page)).toContain(DRAFT_NODE);
  expect(await nodeTreatment(page, DRAFT_NODE)).toBe('draft-model');

  await expect(cableBetween(page, GATEWAY_NODE, DRAFT_NODE)).toHaveCount(1);
  await expect.poll(async () => cablePath(page, DRAFT_CABLE)).not.toBe('');
});
