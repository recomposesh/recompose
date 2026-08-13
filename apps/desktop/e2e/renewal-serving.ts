import type { ElectronApplication, Page } from '@playwright/test';

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { GatewayAnswer } from './gateway-client';
import type { MachineProvider } from './machine-seams';

import { accountsStoredInRegistry } from './accounts-document';
import { sendTurn, turnUnder } from './gateway-client';
import { gatewayAddress } from './gateway-screen';
import { toolHomesFolder } from './provider-screen';
import { focusedGateway } from './scenario-memory';
import { accountHeldAs, gatewayTargetingAKey } from './stored-target-accounts';
import { bindingOf, seedVirtualModels } from './stored-virtual-models';

/** Where a turn is asked for, which is the one path a message arrives on. */
const MESSAGES_PATH = '/v1/messages';

/** The real model every virtual model in these scenarios names, which none of them is about. */
const REAL_MODEL = 'claude-sonnet-5';

/** The virtual model every request in these scenarios arrives under. */
const VIRTUAL_MODEL = 'fast';

const answersGiven = new WeakMap<Page, GatewayAnswer[]>();

const credentialsBeforeTheAct = new WeakMap<Page, string | null>();

function answersHeld(page: Page): GatewayAnswer[] {
  const answers = answersGiven.get(page);

  if (answers === undefined) {
    throw new Error('no step asked this account for anything');
  }

  return answers;
}

export function credentialBeforeTheAct(page: Page): string | null {
  const held = credentialsBeforeTheAct.get(page);

  if (held === undefined) {
    throw new Error('no step read what the store held before the act this scenario is about');
  }

  return held;
}

export function statusesOf(page: Page): number[] {
  return answersHeld(page).map((answer) => answer.status);
}

/** Stands a gateway serving one virtual model over the subscription the scenario connected. */
async function servingThatAccount(page: Page): Promise<string> {
  await gatewayTargetingAKey(page);

  const plan = await accountHeldAs(page, 'subscription');

  await seedVirtualModels(page, focusedGateway(page), [
    bindingOf(VIRTUAL_MODEL, plan.id, REAL_MODEL),
  ]);

  return gatewayAddress(page, focusedGateway(page));
}

/** Serves turns through the account, remembering what the store held before they went. */
export async function turnsNeedingThatAccount(
  page: Page,
  tools: { machineCredential: (provider: MachineProvider) => Promise<string | null> },
  provider: MachineProvider,
  count: number,
): Promise<void> {
  const address = await servingThatAccount(page);

  credentialsBeforeTheAct.set(page, await tools.machineCredential(provider));

  const turns = Array.from({ length: count }, async () =>
    sendTurn(address, MESSAGES_PATH, turnUnder(VIRTUAL_MODEL)),
  );

  answersGiven.set(page, await Promise.all(turns));
}

/**
 * What the app put under its own config homes for one provider, which is nothing for an adopted
 * account.
 *
 * @summary Naming the entries rather than asking whether the folder stands makes a failure say
 * which home appeared, because a pending home and a per-account home mean different things went
 * wrong.
 */
export async function homesTheAppMade(
  app: ElectronApplication,
  provider: MachineProvider,
): Promise<string[]> {
  return readdir(await toolHomesFolder(app, provider)).catch(() => []);
}

/**
 * The config home the app handed the tool for the account it signed in.
 *
 * @summary The vendor derives its keychain item name from this path, so a step aging that
 * credential has to name the same string the app named, not the pointer standing beside it.
 */
export async function appHomeHolding(
  app: ElectronApplication,
  provider: MachineProvider,
): Promise<string> {
  const rows = await accountsStoredInRegistry(app);
  const held = rows.find(
    (row): row is { id: string } =>
      typeof row === 'object' && row !== null && 'kind' in row && row.kind === 'subscription',
  );

  if (held === undefined) {
    throw new Error('no step signed the app in, so no home holds a credential it owns');
  }

  return join(await toolHomesFolder(app, provider), held.id);
}

/** Every config home the app could be keeping a credential under for one provider. */
export async function appHomesFor(
  app: ElectronApplication,
  provider: MachineProvider,
): Promise<string[]> {
  const folder = await toolHomesFolder(app, provider);
  const rows = await accountsStoredInRegistry(app);

  return rows.flatMap((row) =>
    typeof row === 'object' && row !== null && 'id' in row ? [join(folder, String(row.id))] : [],
  );
}
