import type { ElectronApplication, Page } from '@playwright/test';
import type { VirtualModel } from '@recompose/contracts';

import { expect } from '@playwright/test';

import { openGatewayCanvas } from './canvas-screen';
import { seedGateway } from './gateway-screen';
import { focusGateway } from './scenario-memory';
import { storedAccounts } from './stored-target-accounts';
import { bindingOf, seedVirtualModels } from './stored-virtual-models';

/** The gateway every telemetry scenario reads, named the way those scenarios name it. */
export const SERVING_GATEWAY = 'relay';

/** The Anthropic account every telemetry binding targets, named the way the scenarios name it. */
export const ANTHROPIC_ACCOUNT = 'work';

/** A second stored account, which is what stands a second target card on the canvas. */
export const SPARE_ACCOUNT = 'spare';

/** The real model a binding names where a scenario says only that a target serves it. */
const SERVED_MODEL = 'claude-sonnet-5';

/** Keys plainly nobody's, since the arrangement stores an account rather than proving a key. */
const keysNobodyHolds: Record<string, string> = {
  anthropic: 'sk-ant-api03-not-a-real-key-7f2c',
  openai: 'sk-not-a-real-key-9a1b',
};

/** Which vendor each stored account answers under, so two accounts never collide on a name. */
const providersOfAccounts: Record<string, string> = {
  [ANTHROPIC_ACCOUNT]: 'anthropic',
  [SPARE_ACCOUNT]: 'openai',
};

/**
 * How wide the window stands while a scenario reads the footer.
 *
 * @summary The strip is a container query rather than a media query, so its cells leave in a fixed
 * order as the canvas column narrows, and the shipped window with the inspector beside it is already
 * narrow enough to take the token rate and the composition tally away. A scenario that reads either
 * of them is describing a person who can see them, so the window opens wide enough that it stands.
 */
const WIDE_ENOUGH_FOR_THE_WHOLE_FOOTER = 1264;

const WINDOW_MEASURE = { width: 1400, height: 780 };

/** One definition a telemetry scenario asks the gateway to serve. */
export type ServedBinding = {
  /** The name a client asks under, which is also the card the canvas stands for it. */
  model: string;
  /** The stored account the binding answers through. */
  account: string;
  /** The real model it resolves to, or the one every other binding names. */
  providerModel?: string;
};

/** The id one stored account answers under, which is what a binding names it by. */
export async function accountLabeled(page: Page, label: string): Promise<string> {
  const found = (await storedAccounts(page)).find(
    (account) => 'label' in account && account.label === label,
  );

  if (found === undefined) {
    throw new Error(`recompose holds no account labeled "${label}"`);
  }

  return found.id;
}

/**
 * Stores one key account through the lane the catalog writes on, without walking the catalog.
 *
 * @summary A scenario about traffic is describing where it starts when it names the account its
 * requests are served through, so the arrangement takes the shortest honest route to a stored
 * account and leaves the catalog to the scenarios that are about connecting one.
 */
async function connectKeyAccount(page: Page, label: string): Promise<void> {
  const provider = providersOfAccounts[label] ?? 'anthropic';
  const secret = keysNobodyHolds[provider] ?? '';
  const held = (await storedAccounts(page)).some(
    (account) => 'label' in account && account.label === label,
  );

  if (held) {
    return;
  }

  const stored = await page.evaluate(async (asked) => window.recompose['accounts:connect'](asked), {
    provider,
    kind: 'api-key' as const,
    label,
    secret,
  });

  if (!stored.ok) {
    throw new Error(`the app stored no account labeled "${label}": ${stored.error.message}`);
  }
}

/**
 * Opens the window wide enough that every footer cell stands in reach of a reading.
 *
 * @operation A renderer cannot size its own window, so the ask goes to the window itself and the
 * page is then read for the measure that arrived, because the platform is free to hand back less
 * than was asked for on a small display.
 */
async function theWindowStandsWide(app: ElectronApplication, page: Page): Promise<void> {
  await expect
    .poll(async () => {
      await app.evaluate(({ BrowserWindow }, measure) => {
        for (const window of BrowserWindow.getAllWindows()) {
          window.setContentSize(measure.width, measure.height);
        }
      }, WINDOW_MEASURE);

      return page.evaluate(() => window.innerWidth);
    })
    .toBeGreaterThanOrEqual(WIDE_ENOUGH_FOR_THE_WHOLE_FOOTER);
}

async function definitionsOf(
  page: Page,
  bindings: readonly ServedBinding[],
): Promise<VirtualModel[]> {
  const anthropic = await accountLabeled(page, ANTHROPIC_ACCOUNT);
  const spare = bindings.some((binding) => binding.account === SPARE_ACCOUNT)
    ? await accountLabeled(page, SPARE_ACCOUNT)
    : anthropic;

  return bindings.map((binding) =>
    bindingOf(
      binding.model,
      binding.account === SPARE_ACCOUNT ? spare : anthropic,
      binding.providerModel ?? SERVED_MODEL,
    ),
  );
}

async function accountsStandStored(page: Page, bindings: readonly ServedBinding[]): Promise<void> {
  await connectKeyAccount(page, ANTHROPIC_ACCOUNT);

  if (bindings.some((binding) => binding.account === SPARE_ACCOUNT)) {
    await connectKeyAccount(page, SPARE_ACCOUNT);
  }
}

/**
 * A running gateway named after the scenarios, serving the definitions they name.
 *
 * @summary Every telemetry scenario starts from a gateway already answering under one or more
 * names, so the arrangement writes the gateway, its accounts, and its definitions through the lanes
 * the screens write on, and waits for the gateway to list what landed before any step sends a turn.
 */
export async function relayServing(
  app: ElectronApplication,
  page: Page,
  bindings: readonly ServedBinding[],
): Promise<void> {
  await theWindowStandsWide(app, page);
  await seedGateway(page, SERVING_GATEWAY);
  focusGateway(page, SERVING_GATEWAY);
  await accountsStandStored(page, bindings);
  await seedVirtualModels(page, SERVING_GATEWAY, await definitionsOf(page, bindings));
}

/**
 * Rewrites what the gateway serves, so a step can rebind or drop one of its definitions.
 *
 * @summary Any account the new definitions name is stored first, because a scenario refining its
 * arrangement names the target it wants rather than the order the accounts were stored in.
 */
export async function definitionsBecome(
  page: Page,
  bindings: readonly ServedBinding[],
): Promise<void> {
  await accountsStandStored(page, bindings);
  await seedVirtualModels(page, SERVING_GATEWAY, await definitionsOf(page, bindings));
  await openGatewayCanvas(page, SERVING_GATEWAY);
}

/**
 * Runs the clock the surfaces read their window against on, leaving every stamp where it stood.
 *
 * @operation The strip reads a trailing minute off the wall clock the rows were stamped by, and a
 * row is stamped in the engine's own process. Moving the reading clock on inside the page is
 * therefore the whole of what "a minute passed" means to the surface under test, and it leaves the
 * timers real, because the canvas draws on animation frames a fake timer would stop delivering.
 */
export async function theReadingClockRunsOn(page: Page, byMs: number): Promise<void> {
  await page.evaluate((skew) => {
    const wallClock = Date.now.bind(Date);

    Date.now = () => wallClock() + skew;
  }, byMs);
}
