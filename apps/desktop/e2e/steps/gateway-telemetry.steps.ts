import { expect } from '@playwright/test';

import { cableId, canvasNode, ghostNodeId, modelNodeId } from '../canvas-screen';
import { cableStandsSelected, nodeStandsSelected } from '../canvas-selection';
import { Given, Then, When } from '../fixtures';
import {
  closeLogsControl,
  errorsFilter,
  logScope,
  logsHeading,
  onlyRowsRemain,
  ROW_CELLS,
} from '../logs-drawer';
import {
  accountLabeled,
  ANTHROPIC_ACCOUNT,
  definitionsBecome,
  relayServing,
  SERVING_GATEWAY,
  SPARE_ACCOUNT,
} from '../served-gateway';
import { turnThrough } from '../served-traffic';
import {
  departedAccount,
  footerReadingBefore,
  rememberDepartedAccount,
  rememberFooterReading,
  wholeStreamBefore,
} from '../telemetry-memory';
import { theDetailStandsOpen, theDrawerStandsOpen } from '../telemetry-standing';
import { footerReading, logsControl } from '../traffic-footer';

/** The definition every telemetry scenario names first. */
const CREATIVE = 'creative';

/** The second definition, which the scenarios about scoping narrow away from. */
const FAST = 'fast';

Given(
  'a running gateway {string} serving the virtual model {string}',
  async ({ electronApp, page }, gateway: string, model: string) => {
    expect(gateway).toBe(SERVING_GATEWAY);
    await relayServing(electronApp, page, [{ model, account: ANTHROPIC_ACCOUNT }]);
  },
);

Given(
  'a running gateway {string} serving the virtual model {string} bound to the Anthropic account {string}',
  async ({ electronApp, page }, gateway: string, model: string, account: string) => {
    expect(gateway).toBe(SERVING_GATEWAY);
    expect(account).toBe(ANTHROPIC_ACCOUNT);
    await relayServing(electronApp, page, [{ model, account }]);
  },
);

Given(
  'a running gateway {string} serving the virtual models {string} and {string}',
  async ({ electronApp, page }, gateway: string, first: string, second: string) => {
    expect(gateway).toBe(SERVING_GATEWAY);
    await relayServing(electronApp, page, [
      { model: first, account: ANTHROPIC_ACCOUNT },
      { model: second, account: ANTHROPIC_ACCOUNT },
    ]);
  },
);

Given(
  'the gateway detail of a running gateway {string}',
  async ({ electronApp, page }, gateway: string) => {
    expect(gateway).toBe(SERVING_GATEWAY);
    await relayServing(electronApp, page, [{ model: CREATIVE, account: ANTHROPIC_ACCOUNT }]);
    await theDetailStandsOpen(page);
  },
);

Given('requests served through both virtual models', async ({ page }) => {
  await turnThrough(page, CREATIVE);
  await turnThrough(page, FAST);
});

Given('an open logs drawer', async ({ page }) => {
  await theDrawerStandsOpen(page);
});

Given('the logs drawer stands closed', async ({ page }) => {
  await theDetailStandsOpen(page);
  rememberFooterReading(page, await footerReading(page));

  await expect(logsHeading(page, SERVING_GATEWAY)).toBeHidden();
  await expect(logsControl(page)).toHaveAttribute('aria-expanded', 'false');
});

Given(
  '{string} bound to the Anthropic account {string}',
  async ({ page }, model: string, account: string) => {
    expect(account).toBe(ANTHROPIC_ACCOUNT);
    await definitionsBecome(page, [
      { model, account },
      { model: FAST, account: SPARE_ACCOUNT },
    ]);
    await turnThrough(page, model);
    await turnThrough(page, FAST);
    await theDrawerStandsOpen(page);
  },
);

Given('rows that reached a target since removed from the registry', async ({ page }) => {
  const departing = await accountLabeled(page, ANTHROPIC_ACCOUNT);

  await turnThrough(page, CREATIVE);
  await theDrawerStandsOpen(page);
  rememberDepartedAccount(page, departing);

  const removed = await page.evaluate(
    async (id) => window.recompose['accounts:remove']({ id }),
    departing,
  );

  if (!removed.ok) {
    throw new Error(`the app removed no account: ${removed.error.message}`);
  }

  await expect(canvasNode(page, ghostNodeId(departing))).toBeVisible();
});

Given('the scope standing on {string}', async ({ page }, model: string) => {
  await logScope(page, model).click();
  await expect(logScope(page, model)).toHaveAttribute('aria-checked', 'true');
});

When(
  '{string} serves a request through {string}',
  async ({ page }, gateway: string, model: string) => {
    expect(gateway).toBe(SERVING_GATEWAY);
    await turnThrough(page, model);
  },
);

When('the person selects the node of {string}', async ({ page }, model: string) => {
  await nodeStandsSelected(page, modelNodeId(model));
});

When('the person selects the cable of {string}', async ({ page }, model: string) => {
  await cableStandsSelected(page, cableId(model));
});

When(
  'the person selects the target node of the account {string}',
  async ({ page }, account: string) => {
    expect(account).toBe(ANTHROPIC_ACCOUNT);
    await nodeStandsSelected(page, `target:${await accountLabeled(page, account)}`);
  },
);

When('the person selects the ghost target node', async ({ page }) => {
  await nodeStandsSelected(page, ghostNodeId(departedAccount(page)));
});

When('the person turns on the Errors filter', async ({ page }) => {
  await errorsFilter(page).click();
  await expect(errorsFilter(page)).toHaveAttribute('aria-pressed', 'true');
});

When('the person closes and reopens the drawer', async ({ page }) => {
  await closeLogsControl(page).click();
  await expect(logsHeading(page, SERVING_GATEWAY)).toBeHidden();
  await logsControl(page).click();
  await expect(logsHeading(page, SERVING_GATEWAY)).toBeVisible();
});

Then('the drawer leaves', async ({ page }) => {
  await expect(logsHeading(page, SERVING_GATEWAY)).toBeHidden();
});

Then('the footer stands as before', async ({ page }) => {
  await expect(logsControl(page)).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(async () => footerReading(page)).toBe(footerReadingBefore(page));
});

Then('only the rows through {string} remain', async ({ page }, model: string) => {
  await onlyRowsRemain(page, wholeStreamBefore(page), (cells) =>
    (cells[ROW_CELLS.models] ?? '').includes(model),
  );
});
