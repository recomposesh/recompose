import { expect } from '@playwright/test';

import { Given, Then, When } from '../fixtures';
import {
  ANTHROPIC_ACCOUNT,
  definitionsBecome,
  SERVING_GATEWAY,
  SPARE_ACCOUNT,
  theReadingClockRunsOn,
} from '../served-gateway';
import { ANOTHER_CLIENT_APP, answersGiven, ONE_CLIENT_APP, turnThrough } from '../served-traffic';
import { theDetailStandsOpen } from '../telemetry-standing';
import { footerReading, trafficFooter } from '../traffic-footer';

/** How far past the trailing minute a request has to fall to leave every aggregate at zero. */
const PAST_THE_MINUTE_MS = 61_000;

/** What the stand-in provider reports one turn spent, which is what the token rate counts. */
const TOKENS_ONE_TURN_SPENDS = 7;

/** The status the provider turns a request away with where the scenario says only that it failed. */
const TURNED_AWAY = 429;

const EVERY_AGGREGATE_AT_ZERO = ['0 req/min', '0 client apps', '0 tok/min'];

/** Which of the zero readings the strip is not printing, which is empty once they all stand. */
function cellsMissingFrom(reading: string): string[] {
  return EVERY_AGGREGATE_AT_ZERO.filter((cell) => !reading.includes(cell));
}

Given('{string} has served no requests', ({ page }, gateway: string) => {
  expect(gateway).toBe(SERVING_GATEWAY);
  expect(answersGiven(page)).toEqual([]);
});

Given('the person watches the gateway detail', async ({ page }) => {
  await theDetailStandsOpen(page);
  await expect.poll(async () => footerReading(page)).toContain('0 req/min');
});

Given('{string} served its last request over a minute ago', async ({ page }, gateway: string) => {
  expect(gateway).toBe(SERVING_GATEWAY);
  await theDetailStandsOpen(page);
  await turnThrough(page, 'creative');
  await expect.poll(async () => footerReading(page)).toContain('1 req/min');
  await theReadingClockRunsOn(page, PAST_THE_MINUTE_MS);
});

Given('a footer showing no error count', async ({ page }) => {
  await theDetailStandsOpen(page);
  await expect.poll(async () => footerReading(page)).not.toContain('error');
});

Given(
  '{string} served requests from two different client apps within the minute',
  async ({ page }, gateway: string) => {
    expect(gateway).toBe(SERVING_GATEWAY);
    await theDetailStandsOpen(page);
    await turnThrough(page, 'creative', ONE_CLIENT_APP);
    await turnThrough(page, 'creative', ANOTHER_CLIENT_APP);
  },
);

Given(
  '{string} serves two virtual models each bound to a target',
  async ({ page }, gateway: string) => {
    expect(gateway).toBe(SERVING_GATEWAY);
    await definitionsBecome(page, [
      { model: 'creative', account: ANTHROPIC_ACCOUNT },
      { model: 'fast', account: SPARE_ACCOUNT },
    ]);
  },
);

Given(
  '{string} served requests that consumed provider tokens',
  async ({ page }, gateway: string) => {
    expect(gateway).toBe(SERVING_GATEWAY);
    await theDetailStandsOpen(page);
    await turnThrough(page, 'creative');
  },
);

When('{string} fails a request', async ({ keyProbe, page }, gateway: string) => {
  expect(gateway).toBe(SERVING_GATEWAY);
  keyProbe.refusesTurnsWith(TURNED_AWAY, 'the target is busy');
  await turnThrough(page, 'creative');
});

When('the person reads the footer', async ({ page }) => {
  await expect(trafficFooter(page)).toBeVisible();
});

Then(
  'the footer reads zero requests, zero client apps, and zero tokens per minute',
  async ({ page }) => {
    await expect.poll(async () => cellsMissingFrom(await footerReading(page))).toEqual([]);
  },
);

Then('no error count shows', async ({ page }) => {
  await expect.poll(async () => footerReading(page)).not.toContain('error');
});

Then('the footer reflects the request without a manual refresh', async ({ page }) => {
  await expect.poll(async () => footerReading(page)).toContain('1 req/min');
});

Then('every traffic aggregate reads zero', async ({ page }) => {
  await expect.poll(async () => cellsMissingFrom(await footerReading(page))).toEqual([]);
});

Then('the error count appears reading 1', async ({ page }) => {
  await expect.poll(async () => footerReading(page)).toContain('1 error');
});

Then('the footer counts 2 client apps', async ({ page }) => {
  await expect.poll(async () => footerReading(page)).toContain('2 client apps');
});

Then(
  'the tally counts {int} nodes and {int} wires',
  async ({ page }, nodes: number, wires: number) => {
    await expect
      .poll(async () => footerReading(page))
      .toContain(`${String(nodes)} nodes · ${String(wires)} wires`);
  },
);

Then('no dollar figure appears', async ({ page }) => {
  await expect
    .poll(async () => footerReading(page))
    .toContain(`${String(TOKENS_ONE_TURN_SPENDS)} tok/min`);

  expect(await footerReading(page)).not.toContain('$');
});
