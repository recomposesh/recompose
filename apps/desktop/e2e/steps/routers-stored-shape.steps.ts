import type { ElectronApplication, Page } from '@playwright/test';
import type { GatewayConfig } from '@recompose/contracts';

import { expect } from '@playwright/test';
import { rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { RouterMode } from '../routed-gateway';

import { canvasNode, nodeTreatment } from '../canvas-screen';
import { Given, Then } from '../fixtures';
import { addressOfPort, namesListedAt } from '../gateway-client';
import { storedGateway } from '../gateway-screen';
import { userDataFolder } from '../provider-screen';
import { aRoutedModelStands, FIRST_TARGET, SECOND_TARGET } from '../routed-gateway';
import { focusedGateway } from '../scenario-memory';
import { accountLabeled } from '../served-gateway';
import { gatewayTargetingAKey } from '../stored-target-accounts';

/** The mode a router stands under where the scenario names none, since it turns on neither. */
const MODE_A_SCENARIO_LEAVES_UNSAID: RouterMode = 'failover';

/**
 * The binding a shipped build wrote while a virtual model could bind only one target.
 *
 * @summary It carries the field that went away rather than today's routing table, because the
 * document has to be one a person could actually be holding. Writing today's shape under an older
 * stamp would prove that the loader ignores the stamp, not that the migration runs.
 */
function boundToOneTarget(model: string, accountId: string): unknown {
  return {
    id: model,
    displayName: model,
    target: { accountId, providerModel: FIRST_TARGET.providerModel },
  };
}

/**
 * The whole document as an older build stored it: its stamp, its binding, everything else as is.
 *
 * @summary Slug, port and layout come off what the gateway holds now, so the only two things the
 * scenario changes are the two the migration is about.
 */
function storedUnderVersion(held: GatewayConfig, version: number, binding: unknown): unknown {
  const { schemaVersion: _stamped, virtualModels: _routed, ...beyondTheBindings } = held;

  return { ...beyondTheBindings, schemaVersion: version, virtualModels: [binding] };
}

/**
 * Writes a gateway's own file, the way an older build would have left it behind.
 *
 * @summary The rename is what keeps the watcher from reading half a document and quarantining the
 * gateway it belongs to. The interim name carries no `.json`, which is the suffix the watcher and
 * the listing both filter on, so neither ever sees it.
 */
async function theGatewayFileReads(
  app: ElectronApplication,
  slug: string,
  document: unknown,
): Promise<void> {
  const file = join(await userDataFolder(app), 'gateways', `${slug}.json`);
  const beingWritten = `${file}.writing`;

  await writeFile(beingWritten, JSON.stringify(document), 'utf8');
  await rename(beingWritten, file);
}

/**
 * Puts the focused gateway back on disk under an older version, and waits for it to serve again.
 *
 * @summary Waiting on the listing is what says the older document reached the engine rather than
 * the quarantine, since a document the loader could not carry forward leaves no gateway answering
 * at that address at all.
 */
async function anOlderDocumentStands(
  app: ElectronApplication,
  page: Page,
  version: number,
  model: string,
): Promise<void> {
  const held = await storedGateway(page, focusedGateway(page));
  const binding = boundToOneTarget(model, await accountLabeled(page, FIRST_TARGET.account));

  await theGatewayFileReads(app, held.slug, storedUnderVersion(held, version, binding));
  await expect.poll(async () => namesListedAt(addressOfPort(held.port))).toEqual([model]);
}

/**
 * The card the canvas stands for the router a gateway stores.
 *
 * @summary Read off the stored table rather than written as a literal, because a route node id is
 * minted rather than authored. The entry answers in the virtual model's own name, which is the rule
 * every card on the canvas is named under.
 */
function routerCardOf(gateway: GatewayConfig): string {
  const routed = gateway.virtualModels.find(
    (model) => model.routing.nodes[model.routing.entry]?.kind === 'router',
  );

  if (routed === undefined) {
    throw new Error(`no virtual model on "${gateway.displayName}" enters through a router`);
  }

  return `route:${routed.id}`;
}

Given(
  'a gateway stored under version {int} holding a virtual model {string} bound to one target',
  async ({ electronApp, page, scriptedProvider }, version: number, model: string) => {
    await gatewayTargetingAKey(page);
    scriptedProvider.serves(FIRST_TARGET.providerModel);
    await anOlderDocumentStands(electronApp, page, version, model);
  },
);

Given(
  'a virtual model {string} bound to a router over a first and a second target',
  async ({ page, scriptedProvider }, model: string) => {
    await aRoutedModelStands(page, scriptedProvider, {
      model,
      mode: MODE_A_SCENARIO_LEAVES_UNSAID,
      targets: [FIRST_TARGET, SECOND_TARGET],
    });
  },
);

Given("the first target's account left the registry", async ({ page }) => {
  const leaving = await accountLabeled(page, FIRST_TARGET.account);
  const removed = await page.evaluate(
    async (id) => window.recompose['accounts:remove']({ id }),
    leaving,
  );

  if (!removed.ok) {
    throw new Error(
      `the app kept the account labeled "${FIRST_TARGET.account}": ${removed.error.message}`,
    );
  }

  expect(removed.value.accounts.map((account) => account.id)).not.toContain(leaving);
});

Then('the canvas draws the router node', async ({ page }) => {
  const card = routerCardOf(await storedGateway(page, focusedGateway(page)));

  await expect(canvasNode(page, card)).toBeVisible();
  expect(await nodeTreatment(page, card)).toBe('router');
});
