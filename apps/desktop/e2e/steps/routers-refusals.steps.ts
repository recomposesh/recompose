import { expect } from '@playwright/test';

import { Given, Then } from '../fixtures';
import { refusalSentence, sendTurn, turnUnder } from '../gateway-client';
import { lastAnswerFrom } from '../gateway-exchanges';
import { gatewayAddress, storedGateway } from '../gateway-screen';
import {
  aRoutedModelStands,
  FIRST_TARGET,
  SECOND_TARGET,
  theChildrenServing,
} from '../routed-gateway';
import { focusedGateway } from '../scenario-memory';

const MESSAGES_PATH = '/v1/messages';

const REFUSED_BY_CONFIG = 502;

const RATE_LIMITED = 429;

/**
 * What the first child promises before it can serve again, and what the second promises.
 *
 * @summary The later wait rides the child the table declares first, so a refusal reporting the wait
 * it met first, or the longest wait it saw, reports 90 and fails. Only a refusal reporting the
 * earliest reports 30, which is the whole of what the scenario claims.
 */
const FIRST_TARGET_COOLS_FOR = 90;

const SECOND_TARGET_COOLS_FOR = 30;

const RETRY_TIME_SAID = /Try again in (\d+) seconds\./u;

const NAMES_THE_EMPTY_ROUTER = /^The router "[^"]+" in the gateway "[^"]+" holds no child/u;

function secondsTheRefusalPromises(sentence: string): number {
  const said = RETRY_TIME_SAID.exec(sentence);

  if (said?.[1] === undefined) {
    throw new Error(`the refusal names no retry time: ${sentence}`);
  }

  return Number(said[1]);
}

Given(
  'a virtual model {string} bound to a router holding no child',
  async ({ page, scriptedProvider }, model: string) => {
    await aRoutedModelStands(page, scriptedProvider, { model, mode: 'failover', targets: [] });
  },
);

/**
 * Both children rate limited by a turn that already went, which is what leaves them cooling.
 *
 * @summary A child stands cooling because an earlier request met its rate limit, so the scenario
 * sends that earlier request rather than writing the ledger behind the gateway's back. The turn goes
 * under the virtual model the gateway holds, so nothing here has to repeat the name the scenario
 * already gave it.
 */
Given('both targets stand cooling from earlier rate limits', async ({ page, scriptedProvider }) => {
  scriptedProvider.refuses(FIRST_TARGET.providerModel, {
    status: RATE_LIMITED,
    retryAfterSeconds: FIRST_TARGET_COOLS_FOR,
  });
  scriptedProvider.refuses(SECOND_TARGET.providerModel, {
    status: RATE_LIMITED,
    retryAfterSeconds: SECOND_TARGET_COOLS_FOR,
  });

  const gateway = focusedGateway(page);
  const [rateLimited] = (await storedGateway(page, gateway)).virtualModels;

  if (rateLimited === undefined) {
    throw new Error(`the gateway "${gateway}" holds no virtual model to rate limit`);
  }

  await sendTurn(await gatewayAddress(page, gateway), MESSAGES_PATH, turnUnder(rateLimited.id));
});

Then('the gateway answers a typed refusal naming the empty router', ({ page }) => {
  const answer = lastAnswerFrom(page, focusedGateway(page));

  expect(answer.status).toBe(REFUSED_BY_CONFIG);
  expect(refusalSentence(answer.body)).toMatch(NAMES_THE_EMPTY_ROUTER);
});

/**
 * @summary The children are read off the router this scenario actually stood up rather than named
 * here, because a ladder holds two and a judged router holds three, and both mean every one of them
 * when they say each child. Reading the list also keeps a judge out by construction: it is a node of
 * the same table, and never one of the router's children.
 */
Then('the gateway answers a typed refusal naming each child and its reason', async ({ page }) => {
  const sentence = refusalSentence(lastAnswerFrom(page, focusedGateway(page)).body);

  for (const serving of await theChildrenServing(page)) {
    expect(sentence).toContain(`${serving} stands cooling`);
  }
});

Then('the refusal carries the earliest retry time', ({ page }) => {
  const answer = lastAnswerFrom(page, focusedGateway(page));

  expect(answer.status).toBe(RATE_LIMITED);

  const seconds = secondsTheRefusalPromises(refusalSentence(answer.body));

  expect(seconds).toBeGreaterThan(0);
  expect(seconds).toBeLessThanOrEqual(SECOND_TARGET_COOLS_FOR);
});
