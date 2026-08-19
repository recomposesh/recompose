import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { openGatewayCanvas } from './canvas-screen';
import { nodeStandsSelected } from './canvas-selection';
import { focusedGateway } from './scenario-memory';

/** What a router's card stands under, whichever model holds it and whichever mode it spreads by. */
const ROUTER_CARD = '.react-flow__node[data-id^="route:"]';

/** The children the selected router holds, which is the one list the inspector names them in. */
export function childList(page: Page): Locator {
  return page.getByRole('list', { name: 'Children' });
}

/**
 * The row the else branch reads as, found by the very sentence that says why it stays.
 *
 * @summary Every other row can be renamed, so nothing about a label would keep finding this one. The
 * reason is what the else row alone carries, and it is also what the scenario is about.
 */
export function elseRow(page: Page): Locator {
  return childList(page)
    .getByRole('listitem')
    .filter({ has: page.locator('[data-else-reason]') });
}

/**
 * Opens the gateway a scenario seeded and puts its router in the inspector.
 *
 * @summary The card is found by the prefix every router card carries rather than by the model that
 * holds it, so a scenario naming its definition differently selects the same way.
 */
export async function theRouterStandsInspected(page: Page): Promise<void> {
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
