import type { Page } from '@playwright/test';
import type { Account, AccountKind } from '@recompose/contracts';

import { seedGateway } from './gateway-screen';
import {
  keyAScenarioPastes,
  keyStandsConnected,
  openProviderScreen,
  runtimeStandsAdded,
} from './provider-screen';
import { focusedGateway, focusGateway, gatewayInFocusIfAny } from './scenario-memory';

/** The gateway every virtual-model scenario acts on, named once so its steps agree. */
export const GATEWAY_A_SCENARIO_ACTS_ON = 'Codex';

/** What the stored key account reads as, which is also how the picker offers it. */
export const KEY_ACCOUNT = 'work';

/** What the stored aggregator account reads as, chosen to collide with no other option. */
export const AGGREGATOR_ACCOUNT = 'shared';

/** What the stored local runtime reads as, which the runtime rather than a person names. */
export const LOCAL_RUNTIME = 'Ollama';

const ANTHROPIC_KEY_ENTRY = 'Anthropic API';

const AGGREGATOR_KEY_ENTRY = 'OpenRouter';

/** Every account row recompose holds, read through the channel every surface reads it with. */
export async function storedAccounts(page: Page): Promise<Account[]> {
  const answer = await page.evaluate(async () => window.recompose['accounts:list']());

  if (!answer.ok) {
    throw new Error(`the app could not list its accounts: ${answer.error.message}`);
  }

  return answer.value.accounts;
}

/** One stored account as a target names it: by id, with the words a person reads it under. */
export type StoredTarget = { id: string; label: string };

/** The one account held under a kind, because a stored target names an id rather than a label. */
export async function accountHeldAs(page: Page, kind: AccountKind): Promise<StoredTarget> {
  const held = await storedAccounts(page);
  const found = held.find((account) => account.kind === kind);

  if (found === undefined) {
    throw new Error(`recompose holds no ${kind} account`);
  }

  const named = 'label' in found ? found.label : undefined;

  return { id: found.id, label: named ?? found.provider };
}

async function keyStandsStoredOn(
  page: Page,
  screen: string,
  entry: string,
  name: string,
): Promise<void> {
  await openProviderScreen(page, screen);
  await keyStandsConnected(page, { entry, name, pasted: keyAScenarioPastes(entry) });
}

/**
 * The Anthropic key account, standing alone with no gateway beside it.
 *
 * @summary Reach for it where a scenario stands up its own gateways and only wants something for
 * them to target. `gatewayTargetingAKey` seeds one of its own on the way to the account, which
 * leaves a bystander standing in any scenario that counts gateways or reads the first one.
 */
export async function theKeyAccountStandsStored(page: Page): Promise<void> {
  await keyStandsStoredOn(page, 'API keys', ANTHROPIC_KEY_ENTRY, KEY_ACCOUNT);
}

/** The gateway a scenario acts on, put on disk and focused, with nothing else stored. */
export async function theGatewayAScenarioActsOn(page: Page): Promise<void> {
  await seedGateway(page, GATEWAY_A_SCENARIO_ACTS_ON);
  focusGateway(page, GATEWAY_A_SCENARIO_ACTS_ON);
}

/** The gateway a scenario acts on, with the Anthropic key account its definitions target. */
export async function gatewayTargetingAKey(page: Page): Promise<void> {
  await theGatewayAScenarioActsOn(page);
  await theKeyAccountStandsStored(page);
}

/** The focused gateway if a step named one, otherwise the seeded gateway targeting a key. */
export async function gatewayInFocusOrTargetingAKey(page: Page): Promise<string> {
  if (gatewayInFocusIfAny(page) === undefined) {
    await gatewayTargetingAKey(page);
  }

  return focusedGateway(page);
}

/** The aggregator and the local runtime, which stand as targets beside the key. */
export async function everyOfferedKindStandsStored(page: Page): Promise<void> {
  await keyStandsStoredOn(page, 'Aggregators', AGGREGATOR_KEY_ENTRY, AGGREGATOR_ACCOUNT);
  await openProviderScreen(page, 'Local runtimes');
  await runtimeStandsAdded(page, LOCAL_RUNTIME);
}
