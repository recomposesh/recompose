import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

import type { GatewayAnswer } from '../gateway-client';
import type { ScriptedProvider } from '../scripted-provider';

import { Then, When } from '../fixtures';
import { refusalSentence, sendTurn, turnUnder } from '../gateway-client';
import { lastAnswerFrom, recordExchange } from '../gateway-exchanges';
import { gatewayAddress, storedGateway } from '../gateway-screen';
import { FIRST_TARGET, SECOND_TARGET } from '../routed-gateway';
import { focusedGateway } from '../scenario-memory';
import { accountLabeled } from '../served-gateway';

const TURN_PATH = '/v1/messages';

const ANSWERED = 200;

const RATE_LIMITED = 429;

const MALFORMED = 400;

/** The seconds a rate-limited child promises, which is the signal its cooling then runs on. */
const RETRY_THE_PROVIDER_PROMISES = 90;

const RATE_LIMIT_WORDS = 'this account has spent its minute';

/** The refusal a malformed turn earns, which the caller must read back exactly as written. */
const MALFORMED_WORDS = 'max_tokens must be a positive integer';

/** Words only the second child ever says, so an answer proves which child wrote it. */
const WORDS_ONLY_THE_SPARE_SAYS = 'the spare account answered';

/** How an exhausted refusal words a child that was tried, against one that was skipped. */
const TRIED = 'refused with';

const SKIPPED = 'stands cooling';

function refusesWithARateLimit(provider: ScriptedProvider, providerModel: string): void {
  provider.refuses(providerModel, {
    status: RATE_LIMITED,
    kind: 'rate_limit_error',
    words: RATE_LIMIT_WORDS,
    retryAfterSeconds: RETRY_THE_PROVIDER_PROMISES,
  });
}

/**
 * The virtual model this scenario's gateway holds, read off the stored document.
 *
 * @summary The scenarios name the model once, in the Given, so the steps that send a request read
 * it back rather than repeating a literal only the approved text is allowed to change.
 */
async function theRoutedModel(page: Page): Promise<string> {
  const [only] = (await storedGateway(page, focusedGateway(page))).virtualModels;

  if (only === undefined) {
    throw new Error('no step bound a virtual model on the gateway this scenario acts on');
  }

  return only.id;
}

/**
 * Asks the gateway for a turn under its routed name, the way a command-line client would.
 *
 * @summary The answer is kept where every step file reads one, because these scenarios pair a When
 * of their own with the shipped Then that reads what came back.
 */
async function aTurnArrives(page: Page): Promise<void> {
  const gateway = focusedGateway(page);
  const address = await gatewayAddress(page, gateway);
  const model = await theRoutedModel(page);

  recordExchange(page, gateway, await sendTurn(address, TURN_PATH, turnUnder(model)));
}

function whatTheCallerGot(page: Page): GatewayAnswer {
  return lastAnswerFrom(page, focusedGateway(page));
}

/**
 * Takes the account paying for one child out of the registry.
 *
 * @summary This is what a credential failure is on the serving path: the child still stands in the
 * ladder and the account behind it can no longer pay, so the attempt fails before a request leaves.
 * A vault emptied instead would take every child's credential at once, which is the pool-wide
 * failure this scenario exists to rule out.
 */
async function theAccountBehindItLeaves(page: Page, label: string): Promise<void> {
  const id = await accountLabeled(page, label);
  const removed = await page.evaluate(async (asked) => window.recompose['accounts:remove'](asked), {
    id,
  });

  if (!removed.ok) {
    throw new Error(`the app kept the account labeled "${label}": ${removed.error.message}`);
  }
}

/** How many times an exhausted refusal says one thing, so a scenario can hold it to one child. */
function timesSaid(said: string, phrase: string): number {
  return said.split(phrase).length - 1;
}

When(
  'the first target refuses the request with a rate limit',
  async ({ page, scriptedProvider }) => {
    refusesWithARateLimit(scriptedProvider, FIRST_TARGET.providerModel);

    await aTurnArrives(page);
  },
);

When('the first target refuses the request as malformed', async ({ page, scriptedProvider }) => {
  scriptedProvider.refuses(FIRST_TARGET.providerModel, {
    status: MALFORMED,
    kind: 'invalid_request_error',
    words: MALFORMED_WORDS,
  });

  await aTurnArrives(page);
});

When(
  'the first target refuses the request with a credential failure',
  async ({ page, scriptedProvider }) => {
    scriptedProvider.serves(SECOND_TARGET.providerModel, WORDS_ONLY_THE_SPARE_SAYS);

    await theAccountBehindItLeaves(page, FIRST_TARGET.account);
    await aTurnArrives(page);
  },
);

When('both targets refuse the request with rate limits', async ({ page, scriptedProvider }) => {
  refusesWithARateLimit(scriptedProvider, FIRST_TARGET.providerModel);
  refusesWithARateLimit(scriptedProvider, SECOND_TARGET.providerModel);

  await aTurnArrives(page);
});

Then('the caller receives that refusal unchanged', ({ page }) => {
  const answer = whatTheCallerGot(page);

  expect(answer.status).toBe(MALFORMED);
  expect(refusalSentence(answer.body)).toBe(MALFORMED_WORDS);
});

Then('the second target receives nothing', ({ scriptedProvider }) => {
  expect(scriptedProvider.modelsAsked()).not.toContain(SECOND_TARGET.providerModel);
});

Then('the second target answers the request', ({ page, scriptedProvider }) => {
  const answer = whatTheCallerGot(page);

  expect(scriptedProvider.modelsAsked()).toEqual([SECOND_TARGET.providerModel]);
  expect(answer.status).toBe(ANSWERED);
  expect(JSON.stringify(answer.body)).toContain(WORDS_ONLY_THE_SPARE_SAYS);
});

/**
 * @summary Cooling steers a walk and shows nowhere else, so the only way to read which child stands
 * cooling is to ask the ladder to account for itself. A second turn arriving while the other child
 * refuses exhausts the router, and the refusal it writes names every child with its own reason.
 */
Then('only the first target stands cooling', async ({ page, scriptedProvider }) => {
  refusesWithARateLimit(scriptedProvider, SECOND_TARGET.providerModel);

  await aTurnArrives(page);

  const said = refusalSentence(whatTheCallerGot(page).body);

  expect(timesSaid(said, SKIPPED)).toBe(1);
  expect(said).toContain(`${SECOND_TARGET.providerModel} ${TRIED} ${String(RATE_LIMITED)}`);
  expect(said).not.toContain(`${SECOND_TARGET.providerModel} ${SKIPPED}`);
});

Then('each target receives exactly one attempt', ({ scriptedProvider }) => {
  expect(scriptedProvider.modelsAsked()).toEqual([
    FIRST_TARGET.providerModel,
    SECOND_TARGET.providerModel,
  ]);
});

Then('the caller receives one refusal', ({ page }) => {
  const answer = whatTheCallerGot(page);
  const said = refusalSentence(answer.body);

  expect(answer.status).toBe(RATE_LIMITED);
  expect(said).toContain(`${FIRST_TARGET.providerModel} ${TRIED} ${String(RATE_LIMITED)}`);
  expect(said).toContain(`${SECOND_TARGET.providerModel} ${TRIED} ${String(RATE_LIMITED)}`);
  expect(timesSaid(said, TRIED)).toBe(2);
  expect(said).not.toContain(RATE_LIMIT_WORDS);
});
