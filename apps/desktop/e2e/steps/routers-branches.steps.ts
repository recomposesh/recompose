import type { Locator, Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { declineWordFor } from '@recompose/contracts';

import { Given, Then, When } from '../fixtures';
import { theGatewayServesTheWrite } from '../gateway-restart';
import { labelsOffered, theOnlyClassificationCall } from '../judged-classification';
import { aConversationEarns, conversationUnderway } from '../judged-conversations';
import {
  aFreshBranchStandsWired,
  CODE_BRANCH,
  ELSE_TARGET,
  FRESH_BRANCH_TARGET,
} from '../judged-gateway';
import { theBranchesRuled } from '../judged-policy';
import { aTurnArrives } from '../judged-traffic';
import { childList, theRouterStandsInspected } from '../router-inspector';

/** The sheet a branch's two words are written in, whichever surface a person opened it from. */
const BRANCH_SHEET = 'Branch rule';

/** The words a fresh conversation opens with, so nothing it says pairs it with an earlier one. */
const AN_UNSPOKEN_OPENING = 'Something nobody has asked this gateway before.';

/** The branch a scenario named, and the rule it named that branch by, for the steps that follow. */
const branchesInHand = new WeakMap<Page, { label: string; rule: string }>();

function branchInHand(page: Page): { label: string; rule: string } {
  const held = branchesInHand.get(page);

  if (held === undefined) {
    throw new Error('no step in this scenario named the branch it is about');
  }

  return held;
}

/** The row one branch reads as, found by the label it wears rather than by where it sits. */
function branchRow(page: Page, label: string): Locator {
  return childList(page)
    .getByRole('listitem')
    .filter({ has: page.locator(`[data-branch-label]:text-is("${label}")`) });
}

function branchSheet(page: Page): Locator {
  return page.getByRole('dialog', { name: BRANCH_SHEET });
}

/**
 * Every label pill the cables carry, which is where a person reads a branch's name on the canvas.
 *
 * @summary The pills ride the canvas in a layer of their own rather than inside the cables they
 * label, so nothing on a pill says which cable it belongs to. A scenario reads them as the words
 * the wires spell between them, which is what a person sees looking at the composition.
 */
function cablePills(page: Page): Locator {
  return page.locator('.react-flow__edgelabel-renderer').getByRole('button');
}

/** Opens the sheet on one branch the way a person does, from the row that branch stands in. */
async function theBranchSheetOpensOn(page: Page, label: string): Promise<void> {
  await theRouterStandsInspected(page);
  await branchRow(page, label).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Edit prompt' }).click();
  await expect(branchSheet(page)).toBeVisible();
}

async function theSheetIsSaved(page: Page): Promise<void> {
  await theGatewayServesTheWrite(page, async () => {
    await branchSheet(page).getByRole('button', { name: 'Save branch' }).click();
    await expect(branchSheet(page)).toBeHidden();
  });
}

async function theBranchRowOffers(page: Page, label: string, item: string): Promise<void> {
  await theRouterStandsInspected(page);
  await branchRow(page, label).click({ button: 'right' });
  await page.getByRole('menuitem', { name: item }).click();
}

Given(
  'a fresh branch wired to a target, holding neither label nor rule',
  async ({ page, scriptedProvider }) => {
    await aFreshBranchStandsWired(page, scriptedProvider);
  },
);

/**
 * @summary The rule is typed into the sheet rather than written straight into the document,
 * because a branch holding no label is not a shape the document can hold. The label fills itself
 * at the write, so writing around the sheet would arrange a state the app never reaches.
 */
Given('a branch ruled {string} holding no label of its own', async ({ page }, rule: string) => {
  await theBranchSheetOpensOn(page, CODE_BRANCH.label);
  await branchSheet(page).getByRole('textbox', { name: 'Label' }).fill('');
  await branchSheet(page).getByRole('textbox', { exact: true, name: 'Rule as prompt' }).fill(rule);
  await theSheetIsSaved(page);

  branchesInHand.set(page, { label: '', rule });
});

Given('the {string} branch ruled {string}', async ({ page }, label: string, rule: string) => {
  await theBranchesRuled(page, [{ label, rule }]);

  branchesInHand.set(page, { label, rule });
});

Given(
  'a conversation that earned the {string} branch',
  async ({ judge, page, scriptedProvider }, label: string) => {
    await aConversationEarns(page, { judge, provider: scriptedProvider }, label);
  },
);

When(
  'the person asks to delete the {string} branch from its row',
  async ({ page }, label: string) => {
    await theBranchRowOffers(page, label, 'Delete branch');

    branchesInHand.set(page, { label, rule: '' });
  },
);

When('the person deletes the {string} branch', async ({ page }, label: string) => {
  await theBranchRowOffers(page, label, 'Delete branch');

  const asked = page.getByRole('dialog', { name: `Delete the ${label} branch?` });

  await theGatewayServesTheWrite(page, async () => {
    await asked.getByRole('button', { name: 'Delete branch' }).click();
    await expect(asked).toBeHidden();
  });
});

When(
  'the person renames the {string} branch to {string}',
  async ({ page }, label: string, renamed: string) => {
    await theBranchSheetOpensOn(page, label);
    await branchSheet(page).getByRole('textbox', { name: 'Label' }).fill(renamed);
    await theSheetIsSaved(page);
  },
);

When('the person rewrites the rule to {string}', async ({ page }, rewritten: string) => {
  await theBranchSheetOpensOn(page, branchInHand(page).label);
  await branchSheet(page)
    .getByRole('textbox', { exact: true, name: 'Rule as prompt' })
    .fill(rewritten);
  await theSheetIsSaved(page);

  branchesInHand.set(page, { label: branchInHand(page).label, rule: rewritten });
});

When("the conversation's next turn arrives", async ({ page }) => {
  await aTurnArrives(page, conversationUnderway(page));
});

When('a fresh conversation arrives under {string}', async ({ page }, model: string) => {
  await aTurnArrives(page, { model, opening: AN_UNSPOKEN_OPENING });
});

Then(
  'the classification call offers {string} and {string} alone',
  ({ judge }, first: string, second: string) => {
    const branches = [
      { label: first, rule: '' },
      { label: second, rule: '' },
    ];

    expect(labelsOffered(judge)).toEqual([first, second, declineWordFor(branches)]);
  },
);

Then(
  'the classification call offers {string} and never {string}',
  ({ judge }, offered: string, gone: string) => {
    expect(labelsOffered(judge)).toContain(offered);
    expect(labelsOffered(judge)).not.toContain(gone);
  },
);

Then("the fresh branch's child receives nothing", ({ scriptedProvider }) => {
  expect(scriptedProvider.modelsAsked()).not.toContain(FRESH_BRANCH_TARGET.providerModel);
});

/**
 * @summary The rule this scenario writes is short enough to stand as a label whole, so the label
 * drawn from it reads as the rule itself. A rule long enough to be cut is a different claim, and
 * the derivation's own spec is where that one is pinned.
 */
Then("the branch's cable pill prints a label drawn from the rule", async ({ page }) => {
  await expect
    .poll(async () => cablePills(page).allInnerTexts())
    .toContain(branchInHand(page).rule);
});

Then('a confirmation says requests that matched the rule will fall to else', async ({ page }) => {
  const named = branchInHand(page).label;

  await expect(page.getByRole('dialog', { name: `Delete the ${named} branch?` })).toContainText(
    'Requests that matched this rule fall to else from the next one on.',
  );
});

Then('the child behind the else branch receives it', ({ scriptedProvider }) => {
  expect(scriptedProvider.modelsAsked()).toEqual([ELSE_TARGET.providerModel]);
});

Then('the classification call carries the rewritten rule', ({ judge, page }) => {
  expect(theOnlyClassificationCall(judge)).toContain(branchInHand(page).rule);
});
