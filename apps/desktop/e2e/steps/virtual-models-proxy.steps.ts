import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

import type { KeyProbeStub } from '../key-probe-stub';
import type { ScriptedProvider } from '../scripted-provider';

import { Given, Then, When } from '../fixtures';
import {
  anthropicListedIds,
  openAiListedIds,
  readFrom,
  refusalSentence,
  sendTurn,
  turnUnder,
} from '../gateway-client';
import { gatewayAddress, seedGateway, storedGateway } from '../gateway-screen';
import { answerTheProviderGives } from '../key-probe-stub';
import { accountRows, openProviderScreen } from '../provider-screen';
import {
  answerTheGatewayGave,
  focusedGateway,
  focusGateway,
  rememberGatewayAnswer,
} from '../scenario-memory';
import {
  accountHeldAs,
  gatewayTargetingAKey,
  GATEWAY_A_SCENARIO_ACTS_ON,
} from '../stored-target-accounts';
import { bindingOf, seedVirtualModels } from '../stored-virtual-models';
import { vaultLeavesTheMachine } from '../vault-file';

const MESSAGES_PATH = '/v1/messages';

const MODEL_LISTING = '/v1/models';

const REAL_MODEL = 'claude-sonnet-5';

const ANSWERED = 200;

const REFUSED_BY_CONFIG = 502;

const NO_SUCH_MODEL = 404;

/**
 * Every real model name that left the machine, whichever stand-in the scenario was served by.
 *
 * @summary Both stand-ins answer the same reading, and a scenario is served by exactly one of
 * them. Reading only the probe would let a routers scenario prove nothing left the machine while
 * every attempt reached the other stand-in, which is a check that passes by asking the wrong
 * question.
 */
function everythingAsked(probe: KeyProbeStub, scripted: ScriptedProvider): readonly string[] {
  return [...probe.modelsAsked(), ...scripted.modelsAsked()];
}

const namesAsked = new WeakMap<Page, string>();

function nameAsked(page: Page): string {
  const name = namesAsked.get(page);

  if (name === undefined) {
    throw new Error('no step sent a request under a name this scenario could read back');
  }

  return name;
}

async function gatewayServing(page: Page, names: readonly string[]): Promise<void> {
  await gatewayTargetingAKey(page);

  const key = await accountHeldAs(page, 'api-key');

  await seedVirtualModels(
    page,
    focusedGateway(page),
    names.map((name) => bindingOf(name, key.id, REAL_MODEL)),
  );
}

Given(
  'a gateway holding a virtual model {string} bound to a stored key account',
  async ({ page }, name: string) => {
    await gatewayServing(page, [name]);
  },
);

Given('a gateway holding no virtual model named {string}', async ({ page }, name: string) => {
  await seedGateway(page, GATEWAY_A_SCENARIO_ACTS_ON);
  focusGateway(page, GATEWAY_A_SCENARIO_ACTS_ON);

  const stored = await storedGateway(page, GATEWAY_A_SCENARIO_ACTS_ON);

  expect(stored.virtualModels.map((model) => model.id)).not.toContain(name);
});

Given(
  'a virtual model {string} whose target account left the registry',
  async ({ page }, name: string) => {
    await gatewayServing(page, [name]);
    await openProviderScreen(page, 'API Keys');
    await accountRows(page)
      .first()
      .getByRole('button', { name: /^Actions for/u })
      .click();
    await page.getByRole('menuitem', { name: 'Remove' }).click();
    await expect(accountRows(page)).toHaveCount(0);
  },
);

Given(
  'a virtual model {string} whose target account holds no stored credential',
  async ({ electronApp, page }, name: string) => {
    await gatewayServing(page, [name]);
    await vaultLeavesTheMachine(electronApp);
  },
);

Given(
  'a gateway holding virtual models {string} and {string}',
  async ({ page }, first: string, second: string) => {
    await gatewayServing(page, [first, second]);
  },
);

When('a request arrives under {string}', async ({ page }, name: string) => {
  const address = await gatewayAddress(page, focusedGateway(page));

  namesAsked.set(page, name);
  rememberGatewayAnswer(page, await sendTurn(address, MESSAGES_PATH, turnUnder(name)));
});

When('a client asks the gateway for its model listing', async ({ page }) => {
  const address = await gatewayAddress(page, focusedGateway(page));

  rememberGatewayAnswer(page, await readFrom(address, MODEL_LISTING));
});

Then(
  "the target's provider receives it under the target's real model name",
  ({ keyProbe, scriptedProvider }) => {
    expect(everythingAsked(keyProbe, scriptedProvider)).toEqual([REAL_MODEL]);
  },
);

Then('the answer travels back to the caller', ({ page }) => {
  const answer = answerTheGatewayGave(page);

  expect(answer.status).toBe(ANSWERED);
  expect(JSON.stringify(answer.body)).toContain(answerTheProviderGives);
});

Then('the gateway answers a typed refusal naming the unknown model', ({ page }) => {
  const answer = answerTheGatewayGave(page);

  expect(answer.status).toBe(NO_SUCH_MODEL);
  expect(refusalSentence(answer.body)).toContain(nameAsked(page));
});

Then('no request leaves the machine', ({ keyProbe, scriptedProvider }) => {
  expect(everythingAsked(keyProbe, scriptedProvider)).toEqual([]);
});

Then('the gateway answers a typed refusal naming the missing target', ({ page }) => {
  const answer = answerTheGatewayGave(page);

  expect(answer.status).toBe(REFUSED_BY_CONFIG);
  expect(refusalSentence(answer.body)).toContain('no target');
  expect(refusalSentence(answer.body)).toContain(nameAsked(page));
});

Then('the gateway answers a typed refusal naming the missing credential', ({ page }) => {
  const answer = answerTheGatewayGave(page);

  expect(answer.status).toBe(REFUSED_BY_CONFIG);
  expect(refusalSentence(answer.body)).toContain('no account behind it');
  expect(refusalSentence(answer.body)).toContain(nameAsked(page));
});

Then('nothing else receives the request', ({ keyProbe, scriptedProvider }) => {
  expect(everythingAsked(keyProbe, scriptedProvider)).toEqual([]);
});

Then('the listing names {string} and {string}', ({ page }, first: string, second: string) => {
  expect(anthropicListedIds(answerTheGatewayGave(page).body)).toEqual([first, second]);
});

Then('it answers the same set in the Anthropic and the OpenAI shape', ({ page }) => {
  const { body } = answerTheGatewayGave(page);

  expect(openAiListedIds(body)).toEqual(anthropicListedIds(body));
});
