import { expect } from '@playwright/test';

import { bindingKindAsk } from '../canvas-picker';
import { Given, Then } from '../fixtures';
import {
  aRoutedModelStands,
  FIRST_TARGET,
  type RouterMode,
  SECOND_TARGET,
} from '../routed-gateway';

/**
 * The mode a scenario named, refused where it named neither shipped mode.
 *
 * @summary The two modes read as ordinary words in a scenario, so one step definition serves both
 * sentences. A third word would otherwise arrange a router the parse refuses, and the scenario
 * would fail on the write rather than on the word it got wrong.
 */
function modeNamed(said: string): RouterMode {
  if (said !== 'failover' && said !== 'round-robin') {
    throw new Error(`a router ships no "${said}" mode`);
  }

  return said;
}

Given(
  'a virtual model {string} bound to a {word} router over a first and a second target',
  async ({ page, scriptedProvider }, model: string, mode: string) => {
    await aRoutedModelStands(page, scriptedProvider, {
      model,
      mode: modeNamed(mode),
      targets: [FIRST_TARGET, SECOND_TARGET],
    });
  },
);

Then('the second target receives the request', ({ scriptedProvider }) => {
  expect(scriptedProvider.modelsAsked()).toContain(SECOND_TARGET.providerModel);
});

Then('an ask offers a router or a target before anything else', async ({ page }) => {
  const asked = bindingKindAsk(page);

  await expect(asked.getByRole('button', { name: /^Router/u })).toBeVisible();
  await expect(asked.getByRole('button', { name: /^Target/u })).toBeVisible();
  await expect(asked.getByRole('button', { name: /^work$/u })).toBeHidden();
});
