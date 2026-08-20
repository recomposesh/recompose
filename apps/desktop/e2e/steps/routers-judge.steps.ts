import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { fitCanvasToView } from '../canvas-gestures';
import { openGatewayCanvas } from '../canvas-screen';
import { Given, Then, When } from '../fixtures';
import { keyboardReaches } from '../held-clipboard';
import {
  aJudgedModelStands,
  AN_ACCOUNT_NOBODY_CONNECTED,
  CODE_BRANCH,
  JUDGE_TARGET,
  theStandInsForgetTheOpening,
} from '../judged-gateway';
import { aTurnArrives } from '../judged-traffic';
import { theRouterStandsInspected } from '../router-inspector';
import { focusedGateway } from '../scenario-memory';

/** The definition every judge scenario acts on, since none of them names one of its own. */
const JUDGED_MODEL = 'fast';

/** The refusal a vendor spends a judge's minute with, which is what starts a cooldown. */
const RATE_LIMITED = 429;

/** The card the judge stands as, which is the one satellite a judged composition seats. */
const JUDGE_SATELLITE = '.react-flow__node[data-id^="judge:"]';

/** The card the router stands as, whichever model holds it and whichever mode it spreads by. */
const ROUTER_CARD = '.react-flow__node[data-id^="route:"]';

/** How a card says the composition around it is unfinished, which is the frame going dashed. */
const DRAFT_TREATMENT = 'dashed';

/** The clock a cooling judge is expected back by, which reads as an hour and a minute. */
const A_CLOCK_TIME = /\d{1,2}[:.]\d{2}/u;

/** The judge's silhouette, which is the one control the satellite offers. */
function judgeSilhouette(page: Page): Locator {
  return page.locator(JUDGE_SATELLITE).getByRole('button', { name: 'Judge' });
}

/**
 * The pane the canvas stands a subject in, found by the kind of subject it speaks for.
 *
 * @summary The kicker is what the pane says it is about, and it is the only line that changes when
 * a selection moves from a router to the judge above it, so a scenario about which subject the
 * inspector took reads that rather than a name the subject happens to wear.
 */
function paneSpeakingFor(page: Page, kicker: string): Locator {
  return page.locator('aside').filter({
    has: page.locator('header p').filter({ hasText: new RegExp(`^${kicker}$`, 'u') }),
  });
}

/** One fact the inspector prints, found by the label standing on its start edge. */
function factRow(pane: Locator, label: string): Locator {
  return pane.locator(`div:has(> span:text-is("${label}"))`);
}

/** The outline a card draws, which is what a dashed frame and a cooling ring both change. */
async function frameOf(card: Locator): Promise<{ style: string; color: string }> {
  return card.evaluate((held) => {
    const drawn = getComputedStyle(held);

    return { style: drawn.borderTopStyle, color: drawn.borderTopColor };
  });
}

/** The colour one design token resolves to on this screen, so no reading hardcodes a value. */
async function tokenColor(page: Page, token: string): Promise<string> {
  return page.evaluate((named) => {
    const probe = document.createElement('span');

    probe.style.color = `var(${named})`;
    document.body.append(probe);

    const resolved = getComputedStyle(probe).color;

    probe.remove();

    return resolved;
  }, token);
}

async function theJudgedCanvasOpens(page: Page): Promise<void> {
  await openGatewayCanvas(page, focusedGateway(page));
  await fitCanvasToView(page);
}

Given(
  'a conditional router with its judge on the canvas',
  async ({ judge, page, scriptedProvider }) => {
    await aJudgedModelStands(page, { judge, provider: scriptedProvider }, { model: JUDGED_MODEL });
    await theJudgedCanvasOpens(page);
  },
);

/**
 * @summary The cooldown lives in the gateway's own ledger rather than in either stand-in, so the
 * opening turn is what puts the judge into it and the stand-ins are put back afterwards, leaving
 * the scenario reading a cooling judge rather than a scripted refusal still standing.
 */
Given(
  'a conditional router whose judge stands cooling from an earlier rate limit',
  async ({ judge, page, scriptedProvider }) => {
    await aJudgedModelStands(page, { judge, provider: scriptedProvider }, { model: JUDGED_MODEL });

    judge.refusesWith(RATE_LIMITED, 'slow down');

    await aTurnArrives(page);

    theStandInsForgetTheOpening({ judge, provider: scriptedProvider });
    await theJudgedCanvasOpens(page);
  },
);

Given(
  'a conditional router holding a {string} branch and an else branch but no judge',
  async ({ judge, page, scriptedProvider }, label: string) => {
    await aJudgedModelStands(
      page,
      { judge, provider: scriptedProvider },
      {
        model: JUDGED_MODEL,
        branches: [{ ...CODE_BRANCH, label }],
        judgeAccountId: AN_ACCOUNT_NOBODY_CONNECTED,
      },
    );
    await theJudgedCanvasOpens(page);
  },
);

/**
 * @summary The walk is real presses from a blurred start, because placing focus from script would
 * pass just as happily on a satellite the tab order never visits. Enter on the silhouette is what
 * a person presses, and the selection it lands is what puts the judge in the inspector.
 */
When(
  'the person, with the keyboard alone, moves focus to the judge node and selects it',
  async ({ page }) => {
    await keyboardReaches(page, judgeSilhouette(page));
    await page.keyboard.press('Enter');

    await expect(judgeSilhouette(page)).toHaveAttribute('aria-pressed', 'true');
  },
);

When('the person selects the judge node', async ({ page }) => {
  await judgeSilhouette(page).click();

  await expect(judgeSilhouette(page)).toHaveAttribute('aria-pressed', 'true');
});

Then('the inspector speaks for the judge', async ({ page }) => {
  await expect(paneSpeakingFor(page, 'Judge')).toBeVisible();
});

Then("it names the judge's account and provider model", async ({ judge, page }) => {
  const pane = paneSpeakingFor(page, 'Judge');

  await expect(factRow(pane, 'Address')).toContainText(new URL(judge.origin).port);
  await expect(factRow(pane, 'Model')).toContainText(JUDGE_TARGET.providerModel);
});

/**
 * @summary The satellite sheds its caption, so the ring is the whole of what the canvas says about
 * a cooling judge. It is measured against the attention token as the screen resolves it rather
 * than against a written colour, which would pass on a scheme that never painted it.
 */
Then('the judge node wears its cooling state', async ({ page }) => {
  const attention = await tokenColor(page, '--color-attention');

  await expect.poll(async () => (await frameOf(judgeSilhouette(page))).color).toBe(attention);
});

Then('the inspector prints the remaining cooldown window', async ({ page }) => {
  const pane = paneSpeakingFor(page, 'Judge');

  await expect(factRow(pane, 'Standing')).toContainText('Cooling');
  await expect(factRow(pane, 'Back by')).toHaveText(A_CLOCK_TIME);
});

Then('the router stands in its draft treatment', async ({ page }) => {
  const frame = page.locator(ROUTER_CARD).locator('button[aria-pressed]');

  await expect(frame).toBeVisible();
  expect((await frameOf(frame)).style).toBe(DRAFT_TREATMENT);
});

Then('the definition cannot complete until a judge is bound', async ({ page }) => {
  await theRouterStandsInspected(page);

  await expect(
    paneSpeakingFor(page, 'Router').getByText(
      /routes nothing by rule.+lands on else until a judge binds/u,
    ),
  ).toBeVisible();
});
