import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { openGatewayCanvas } from '../canvas-screen';
import { nodeStandsSelected } from '../canvas-selection';
import { Given, Then, When } from '../fixtures';
import { pickWithTheKeyboard } from '../keyboard-walk';
import { aRoutedModelStands, FIRST_TARGET, SECOND_TARGET, THIRD_TARGET } from '../routed-gateway';
import { focusedGateway } from '../scenario-memory';

/** The definition the inspector scenarios act on, since neither names one of its own. */
const ROUTED_MODEL = 'fast';

/** What a router's card stands under, whichever model holds it and whichever mode it spreads by. */
const ROUTER_CARD = '.react-flow__node[data-id^="route:"]';

/** The move that carries a row one rung nearer the front, apart from its twin going the other way. */
const TOWARD_THE_FRONT = /\bup$/u;

/** The children the selected router holds, which is the one list the inspector names them in. */
function childList(page: Page): Locator {
  return page.getByRole('list', { name: 'Children' });
}

/** The pane the canvas stands the selected subject in, found by the very list it is asked about. */
function inspectorPane(page: Page): Locator {
  return page.locator('aside').filter({ has: childList(page) });
}

/** The row one child reads as, named by the real model it serves rather than by its rank. */
function childRow(page: Page, providerModel: string): Locator {
  return childList(page).getByRole('listitem').filter({ hasText: providerModel });
}

/**
 * Opens the gateway a scenario seeded and puts its router in the inspector.
 *
 * @summary The card is found by the prefix every router card carries rather than by the model that
 * holds it, so a scenario naming its definition differently selects the same way.
 */
async function theRouterStandsInspected(page: Page): Promise<void> {
  await openGatewayCanvas(page, focusedGateway(page));

  const card = page.locator(ROUTER_CARD);

  await expect(card).toBeVisible();

  const nodeId = await card.getAttribute('data-id');

  if (nodeId === null) {
    throw new Error('the router card stands under no id the canvas could select it by');
  }

  await nodeStandsSelected(page, nodeId);
  await expect(childList(page)).toBeVisible();
}

Given(
  'the inspector open on a failover router over three targets',
  async ({ page, scriptedProvider }) => {
    await aRoutedModelStands(page, scriptedProvider, {
      model: ROUTED_MODEL,
      mode: 'failover',
      targets: [FIRST_TARGET, SECOND_TARGET, THIRD_TARGET],
    });
    await theRouterStandsInspected(page);
  },
);

/**
 * Puts the keyboard on the control a person meets first in this panel, and nowhere nearer.
 *
 * @summary The walk has to start somewhere, and starting at the window's edge spends a hundred
 * presses crossing every card and cable before it arrives. It starts at the mode control instead,
 * which stands above the ladder and is the first thing the inspector offers. Nothing here touches
 * the control under test, so a move button that fell out of the tab order is still never reached.
 */
async function theKeyboardStandsOnTheModeControl(page: Page): Promise<void> {
  const mode = page.getByRole('radiogroup', { name: 'Routing mode' }).getByRole('radio').first();

  await expect(mode).toBeVisible();
  await mode.focus();
}

When('the person, with the keyboard alone, moves the third child up one rank', async ({ page }) => {
  await theKeyboardStandsOnTheModeControl(page);
  await pickWithTheKeyboard(
    page,
    childRow(page, THIRD_TARGET.providerModel).getByRole('button', { name: TOWARD_THE_FRONT }),
    `the move-up control of the child serving "${THIRD_TARGET.providerModel}"`,
  );
});

Then("the moved child's row prints rank {int}", async ({ page }, rank: number) => {
  await expect(childRow(page, THIRD_TARGET.providerModel).locator('[data-rank]')).toHaveText(
    String(rank),
  );
});

Then('the live region announces {string}', async ({ page }, said: string) => {
  await expect(inspectorPane(page).getByRole('status')).toContainText(said);
});

Then(
  'the ladder names the children {string}, {string} and {string}',
  async ({ page }, lead: string, second: string, third: string) => {
    await expect(childList(page).locator('[data-child-name]')).toHaveText([lead, second, third]);
  },
);

When('the person selects the router node', async ({ page }) => {
  await theRouterStandsInspected(page);
});

Then('the inspector lists the children without rank numbers', async ({ page }) => {
  await expect(childList(page).getByRole('listitem')).toHaveText([
    new RegExp(`^\\D*${FIRST_TARGET.providerModel}$`, 'u'),
    new RegExp(`^\\D*${SECOND_TARGET.providerModel}$`, 'u'),
  ]);
});
