import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

import type { GatewayAnswer } from '../gateway-client';
import type { ScriptedProvider } from '../scripted-provider';

import { Given, Then, When } from '../fixtures';
import { openAiRefusalCode, refusalSentence, sendTurn, turnUnder } from '../gateway-client';
import { gatewayAddress } from '../gateway-screen';
import { FIRST_TARGET, SECOND_TARGET, theRoutedModelName } from '../routed-gateway';
import { focusedGateway } from '../scenario-memory';

const MESSAGES_PATH = '/v1/messages';

const RESPONSES_PATH = '/v1/responses';

const EARLIER_RESPONSE_ID = 'resp_8f21';

const ANSWERED = 200;

const REFUSED_AS_A_CALLER_MISTAKE = 400;

const RATE_LIMITED = 429;

const RATE_LIMIT_RETRY_SECONDS = 90;

const answersToChainedTurns = new WeakMap<Page, GatewayAnswer>();

async function addressOfTheFocusedGateway(page: Page): Promise<string> {
  return gatewayAddress(page, focusedGateway(page));
}

function forgetTheTurnsThatArrangedTheScenario(provider: ScriptedProvider): void {
  provider.mock.clearRequests();
}

function answerToTheChainedTurn(page: Page): GatewayAnswer {
  const answer = answersToChainedTurns.get(page);

  if (answer === undefined) {
    throw new Error('no step sent a chained turn this scenario could read the answer of');
  }

  return answer;
}

Given('the first target stands cooling from a rate limit', async ({ page, scriptedProvider }) => {
  scriptedProvider.refuses(FIRST_TARGET.providerModel, {
    status: RATE_LIMITED,
    kind: 'rate_limit_error',
    retryAfterSeconds: RATE_LIMIT_RETRY_SECONDS,
  });

  const address = await addressOfTheFocusedGateway(page);
  const answer = await sendTurn(address, MESSAGES_PATH, turnUnder(await theRoutedModelName(page)));

  expect(scriptedProvider.modelsAsked()).toContain(FIRST_TARGET.providerModel);
  expect(answer.status).toBe(ANSWERED);

  forgetTheTurnsThatArrangedTheScenario(scriptedProvider);
});

When('two requests arrive under {string}', async ({ page }, name: string) => {
  const address = await addressOfTheFocusedGateway(page);

  await sendTurn(address, MESSAGES_PATH, turnUnder(name));
  await sendTurn(address, MESSAGES_PATH, turnUnder(name));
});

When(
  'a chained turn arrives under {string} carrying its previous response id',
  async ({ page }, name: string) => {
    const address = await addressOfTheFocusedGateway(page);
    const answer = await sendTurn(address, RESPONSES_PATH, {
      model: name,
      input: 'Say hello.',
      previous_response_id: EARLIER_RESPONSE_ID,
    });

    answersToChainedTurns.set(page, answer);
  },
);

Then('each target receives one of them', ({ scriptedProvider }) => {
  const asked = scriptedProvider.modelsAsked();

  expect(asked).toHaveLength(2);
  expect(new Set(asked)).toEqual(
    new Set([FIRST_TARGET.providerModel, SECOND_TARGET.providerModel]),
  );
});

Then('the first target receives nothing', ({ scriptedProvider }) => {
  expect(scriptedProvider.modelsAsked()).not.toContain(FIRST_TARGET.providerModel);
});

Then('the gateway answers a typed refusal naming the chained turn', ({ page }) => {
  const answer = answerToTheChainedTurn(page);

  expect(answer.status).toBe(REFUSED_AS_A_CALLER_MISTAKE);
  expect(openAiRefusalCode(answer.body)).toBe('chained_turn');
  expect(refusalSentence(answer.body)).toContain('resumes server-side state');
});
