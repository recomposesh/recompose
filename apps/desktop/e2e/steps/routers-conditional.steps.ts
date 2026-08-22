import { expect } from '@playwright/test';

import { Given, Then, When } from '../fixtures';
import { refusalSentence } from '../gateway-client';
import { lastAnswerFrom } from '../gateway-exchanges';
import { labelsOffered, theOnlyClassificationCall } from '../judged-classification';
import {
  CHAT_BRANCH,
  childBehindTheBranch,
  CODE_BRANCH,
  ELSE_TARGET,
  JUDGE_BUDGET_MS,
} from '../judged-gateway';
import { theBranchesRuled } from '../judged-policy';
import { aTurnArrives } from '../judged-traffic';
import { focusedGateway } from '../scenario-memory';

/** What a router answers when its judge reached no verdict, which no child ever carried. */
const NO_VERDICT = 503;

/** How long past the budget a late judge waits, so its first byte lands after the clock ran out. */
const LATER_THAN_THE_BUDGET_MS = JUDGE_BUDGET_MS + 600;

/** How long a late answer is given to arrive before a scenario reads what it moved. */
const LONG_ENOUGH_FOR_THE_LATE_ANSWER_MS = LATER_THAN_THE_BUDGET_MS + 600;

/**
 * What the judge actually answers for each broken answer a scenario names.
 *
 * @summary The scenario names the shape of the trouble in its own words, and the words a judge would
 * have written for that shape live here. Keeping the table beside the steps is what lets the example
 * rows read as the rules they illustrate rather than as strings a reader has to decode.
 */
const BROKEN_ANSWERS: Record<string, string> = {
  'text matching no branch label': 'nonsense',
  'two branch labels at once': 'code chat',
  'an empty completion': '',
  'a label cut short partway': 'cod',
  'the word "else"': 'else',
};

function brokenAnswerNamed(said: string): string {
  const written = BROKEN_ANSWERS[said];

  if (written === undefined) {
    throw new Error(`no scenario has said what a judge answering "${said}" writes`);
  }

  return written;
}

Given(
  'the {string} branch ruled {string} and the {string} branch ruled {string}',
  async ({ page }, code: string, codeRule: string, chat: string, chatRule: string) => {
    await theBranchesRuled(page, [
      { label: code, rule: codeRule },
      { label: chat, rule: chatRule },
    ]);
  },
);

Given(/^the judge answers with (.+) on every call$/u, ({ judge }, said: string) => {
  judge.names(brokenAnswerNamed(said));
});

Given(
  'the judge answers with two branch labels at once, then {string} on the retry',
  ({ judge }, clean: string) => {
    judge.namesInTurn([brokenAnswerNamed('two branch labels at once'), clean]);
  },
);

Given("the judge doesn't answer within the timeout budget", ({ judge }) => {
  judge.saysNothing();
});

Given('the judge sends its first byte only after the timeout budget', ({ judge }) => {
  judge.answersLate(CODE_BRANCH.label, LATER_THAN_THE_BUDGET_MS);
});

When(
  'a request arrives that the judge classifies as {string}',
  async ({ judge, page }, label: string) => {
    judge.names(label);

    await aTurnArrives(page);
  },
);

Then(
  'the child behind the {string} branch receives the request',
  ({ scriptedProvider }, label: string) => {
    expect(scriptedProvider.modelsAsked()).toEqual([childBehindTheBranch(label)]);
  },
);

Then('the child behind the else branch receives the request', ({ scriptedProvider }) => {
  expect(scriptedProvider.modelsAsked()).toEqual([ELSE_TARGET.providerModel]);
});

Then('no child of the router receives the request', ({ scriptedProvider }) => {
  expect(scriptedProvider.modelsAsked()).toEqual([]);
});

Then('the caller reads a refusal saying the judge reached no verdict', ({ page }) => {
  const answer = lastAnswerFrom(page, focusedGateway(page));

  expect(answer.status).toBe(NO_VERDICT);
  expect(refusalSentence(answer.body)).toContain('got no verdict from its judge');
});

Then("the classification call carries each branch's label beside its rule text", ({ judge }) => {
  const asked = theOnlyClassificationCall(judge);

  expect(asked).toContain(`${CODE_BRANCH.label}: ${CODE_BRANCH.rule}`);
  expect(asked).toContain(`${CHAT_BRANCH.label}: ${CHAT_BRANCH.rule}`);
});

Then('else stands nowhere among the offered labels', ({ judge }) => {
  expect(labelsOffered(judge)).toEqual([CODE_BRANCH.label, CHAT_BRANCH.label]);
});

Then('the judge receives exactly two classification calls', ({ judge }) => {
  expect(judge.classificationsAsked()).toHaveLength(2);
});

/**
 * @summary The late answer is waited out rather than raced, because the whole claim is that nothing
 * changes once the walk has already refused. Reading the children straight away would pass before
 * the judge had even spoken, which proves nothing about what its answer moved.
 */
Then("the judge's late answer moves no traffic", async ({ page, scriptedProvider }) => {
  await page.waitForTimeout(LONG_ENOUGH_FOR_THE_LATE_ANSWER_MS);

  expect(scriptedProvider.modelsAsked()).toEqual([]);
});
