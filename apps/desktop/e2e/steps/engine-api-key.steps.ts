import type { Page } from '@playwright/test';
import type { GatewayConfig } from '@recompose/contracts';

import { expect } from '@playwright/test';

import { Given, Then, When } from '../fixtures';
import { addressOfPort, namedGateway, readFrom, refusalSentence } from '../gateway-client';
import { lastAnswerFrom, lastTwoAnswers, recordExchange } from '../gateway-exchanges';
import { gatewayRowReading, seedGateway, storedGateway } from '../gateway-screen';

/** Where an SDK starts against a base URL, and the shortest guarded path a scenario can ask for. */
const MODEL_LISTING = '/v1/models';

/** Where a person's own tooling reads what a gateway served, which the key closes with the rest. */
const REQUEST_LOGS = '/v0/management/logs';

const UNAUTHORIZED = 401;

const SERVED = 200;

/** The key these scenarios put on the gateway, in the shape the app mints one. */
const MINTED = 'rc-local-e2eJ8xQm2NpVr4wYs6bZa1cLd3fGh5jKm';

async function addressOf(page: Page, name: string): Promise<string> {
  return addressOfPort((await storedGateway(page, name)).port);
}

async function storeApiKey(page: Page, name: string, required: boolean): Promise<void> {
  const stored = await storedGateway(page, name);
  const rewritten: GatewayConfig = { ...stored, apiKey: { value: MINTED, required } };

  await page.evaluate(
    async (next: GatewayConfig) => window.recompose['gateways:update'](next),
    rewritten,
  );

  await expect(gatewayRowReading(page, name, 'Running')).toBeVisible();
}

async function askModels(
  page: Page,
  name: string,
  headers: Record<string, string> = {},
): Promise<void> {
  recordExchange(page, name, await readFrom(await addressOf(page, name), MODEL_LISTING, headers));
}

const CARRIED_IN: Record<string, Record<string, string>> = {
  'the Authorization header': { authorization: `Bearer ${MINTED}` },
  'the x-api-key header': { 'x-api-key': MINTED },
  'the x-goog-api-key header': { 'x-goog-api-key': MINTED },
};

Given('a running gateway named {string} requiring an API key', async ({ page }, name: string) => {
  await seedGateway(page, name);
  await expect(gatewayRowReading(page, name, 'Running')).toBeVisible();
  await storeApiKey(page, name, true);
});

Given('a running gateway named {string} holding no API key', async ({ page }, name: string) => {
  await seedGateway(page, name);
  await expect(gatewayRowReading(page, name, 'Running')).toBeVisible();
});

Given('{string} no longer requires its API key', async ({ page }, name: string) => {
  await storeApiKey(page, name, false);
});

When(
  'a client sends a model request to {string} carrying no key',
  async ({ page }, name: string) => {
    await askModels(page, name);
  },
);

When(
  'a client sends a model request to {string} carrying {string}',
  async ({ page }, name: string, presented: string) => {
    await askModels(page, name, { 'x-api-key': presented });
  },
);

When(
  'a client sends a model request to {string} presenting the key in {}',
  async ({ page }, name: string, field: string) => {
    const headers = CARRIED_IN[field];

    if (headers === undefined) {
      const listing = `${MODEL_LISTING}?key=${MINTED}`;

      recordExchange(page, name, await readFrom(await addressOf(page, name), listing));

      return;
    }

    await askModels(page, name, headers);
  },
);

When(
  'a client sends a model request to {string} carrying a placeholder beside the key',
  async ({ page }, name: string) => {
    await askModels(page, name, {
      'x-api-key': 'the-placeholder-the-client-invented',
      authorization: `Bearer ${MINTED}`,
    });
  },
);

When('a client checks the health of {string} carrying no key', async ({ page }, name: string) => {
  recordExchange(page, name, await readFrom(await addressOf(page, name), '/health'));
});

When(
  'a client asks {string} for its request logs carrying no key',
  async ({ page }, name: string) => {
    recordExchange(page, name, await readFrom(await addressOf(page, name), REQUEST_LOGS));
  },
);

Then('{string} refuses with an authentication error naming itself', ({ page }, name: string) => {
  const answer = lastAnswerFrom(page, name);

  expect(answer.status).toBe(UNAUTHORIZED);
  expect(refusalSentence(answer.body)).toContain(name);
});

Then('the refusal challenges the client to present a bearer credential', ({ page }) => {
  expect(lastTwoAnswers(page)[1]?.challenge).toContain('Bearer');
});

Then('the two answers read alike', ({ page }) => {
  const [wrong, missing] = lastTwoAnswers(page);

  expect(wrong).toEqual(missing);
});

Then('{string} answers with its own name', ({ page }, name: string) => {
  const answer = lastAnswerFrom(page, name);

  expect(answer.status).toBe(SERVED);
  expect(namedGateway(answer.body)).toBe(name);
});

Then('{string} serves the request', ({ page }, name: string) => {
  expect(lastAnswerFrom(page, name).status).toBe(SERVED);
});

Then('{string} answers without asking for a key', ({ page }, name: string) => {
  expect(lastAnswerFrom(page, name).status).toBe(SERVED);
});
