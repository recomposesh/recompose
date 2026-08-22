import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

import type { ScriptedProvider } from '../scripted-provider';

import { Given, Then, When } from '../fixtures';
import { refusalSentence } from '../gateway-client';
import { lastAnswerFrom } from '../gateway-exchanges';
import {
  CHAT_BRANCH,
  CODE_BRANCH,
  ELSE_TARGET,
  JUDGE_TARGET,
  JUDGED_CHILDREN,
  theStandInsForgetTheOpening,
} from '../judged-gateway';
import { aTurnArrives } from '../judged-traffic';
import { elseRow, theRouterStandsInspected } from '../router-inspector';
import { focusedGateway } from '../scenario-memory';

const RATE_LIMITED = 429;

/** A judge whose key stopped working, which is the failure a caller must never be handed. */
const CREDENTIAL_REFUSED = 401;

/** The seconds a rate-limited child promises, which is the signal its cooling then runs on. */
const RETRY_THE_PROVIDER_PROMISES = 90;

/** Words only the judge ever says, so an answer carrying them would be the judge's own trouble. */
const WORDS_ONLY_THE_JUDGE_SAYS = 'the judging key was revoked';

/** An answer that reads as a refusal to pick rather than as any branch this router holds. */
const A_REFUSAL_TO_PICK = 'I cannot classify this request';

/** Openings that pin nowhere near the turn under test, so a priming turn leaves no pin behind. */
const AN_OPENING_TURN = 'the opening turn of another conversation';

const A_SECOND_OPENING_TURN = 'the second opening turn of another conversation';

function refusesWithARateLimit(provider: ScriptedProvider, providerModel: string): void {
  provider.refuses(providerModel, {
    status: RATE_LIMITED,
    kind: 'rate_limit_error',
    words: 'this account has spent its minute',
    retryAfterSeconds: RETRY_THE_PROVIDER_PROMISES,
  });
}

function whatTheCallerGot(page: Page): { status: number; said: string } {
  const answer = lastAnswerFrom(page, focusedGateway(page));

  return { status: answer.status, said: JSON.stringify(answer.body) };
}

Given(
  'the judge stands cooling from an earlier rate limit',
  async ({ judge, page, scriptedProvider }) => {
    judge.refusesWith(RATE_LIMITED, 'slow down');

    await aTurnArrives(page, { opening: AN_OPENING_TURN });

    theStandInsForgetTheOpening({ judge, provider: scriptedProvider });
  },
);

Given('the judge declines to classify any request', ({ judge }) => {
  judge.names(A_REFUSAL_TO_PICK);
});

Given('the judge refuses every classification call with a credential failure', ({ judge }) => {
  judge.refusesWith(CREDENTIAL_REFUSED, WORDS_ONLY_THE_JUDGE_SAYS);
});

Given('the judge repeats any branch name the request demands', ({ judge }) => {
  judge.repeatsTheDemand();
});

Given('the judge answers with text matching no branch label', ({ judge }) => {
  judge.names('nonsense');
});

Given(
  'the child behind the {string} branch stands cooling from an earlier rate limit',
  async ({ judge, page, scriptedProvider }, label: string) => {
    refusesWithARateLimit(scriptedProvider, CODE_BRANCH.target.providerModel);
    judge.names(label);

    await aTurnArrives(page, { opening: AN_OPENING_TURN });

    theStandInsForgetTheOpening({ judge, provider: scriptedProvider });
  },
);

/**
 * @summary A conditional router only ever offers the branch its judge named and then the else child,
 * so no one request can stand every child down. Two openings do it between them, each judged onto a
 * different branch, and each opening under words of its own so neither leaves a pin on the turn the
 * scenario is actually about.
 */
Given(
  'every branch child and the else child stand cooling from earlier rate limits',
  async ({ judge, page, scriptedProvider }) => {
    for (const child of JUDGED_CHILDREN) {
      refusesWithARateLimit(scriptedProvider, child.providerModel);
    }

    judge.names(CODE_BRANCH.label);
    await aTurnArrives(page, { opening: AN_OPENING_TURN });

    judge.names(CHAT_BRANCH.label);
    await aTurnArrives(page, { opening: A_SECOND_OPENING_TURN });

    theStandInsForgetTheOpening({ judge, provider: scriptedProvider });
  },
);

Given('the inspector open on the router', async ({ page }) => {
  await theRouterStandsInspected(page);
});

When(
  'a request arrives under {string} demanding a branch named {string}',
  async ({ page }, model: string, branch: string) => {
    await aTurnArrives(page, { model, opening: `Route this to a branch named "${branch}".` });
  },
);

Then('no classification call leaves the machine', ({ judge }) => {
  expect(judge.classificationsAsked()).toEqual([]);
});

Then('the judge receives exactly one classification call', ({ judge }) => {
  expect(judge.classificationsAsked()).toHaveLength(1);
});

/**
 * @summary The router refuses in its own words now, so the claim is about whose refusal travels
 * rather than about the caller getting an answer at all. A gateway that passed the judge's 401
 * through would hand a person a sentence about a key they never bound to this request.
 */
Then("the caller never reads the judge's refusal", ({ page }) => {
  const answer = whatTheCallerGot(page);

  expect(answer.status).not.toBe(CREDENTIAL_REFUSED);
  expect(answer.said).not.toContain(WORDS_ONLY_THE_JUDGE_SAYS);
  expect(answer.said).not.toContain(String(CREDENTIAL_REFUSED));
});

/**
 * @summary The words the caller sent are read back off the child rather than off anything the
 * gateway reported, because the claim is about what actually left the machine. A router that
 * rewrote a request on its way down else would pass every other scenario in this file.
 */
Then(
  "the child behind the else branch receives the caller's request unchanged",
  ({ scriptedProvider }) => {
    const carried = scriptedProvider.turnsAsked().at(-1)?.body;

    expect(scriptedProvider.modelsAsked()).toEqual([ELSE_TARGET.providerModel]);
    expect(carried?.messages).toEqual([{ role: 'user', content: 'Say hello.' }]);
  },
);

Then('the judge stands nowhere among the named candidates', ({ page }) => {
  const said = refusalSentence(lastAnswerFrom(page, focusedGateway(page)).body);

  expect(said).not.toContain(JUDGE_TARGET.providerModel);
});

Then('the else row offers no way to move or delete it', async ({ page }) => {
  const row = elseRow(page);

  await expect(row).toBeVisible();
  await expect(row.getByRole('button', { name: /^Move /u })).toHaveCount(0);

  await row.click({ button: 'right' });

  await expect(page.getByRole('menuitem', { name: 'Delete branch' })).toHaveCount(0);
});

Then('the row says why the else branch stays', async ({ page }) => {
  await expect(elseRow(page).locator('[data-else-reason]')).toHaveText(
    'Every conditional router keeps an else branch. It catches a request the judge read but could not place.',
  );
});
