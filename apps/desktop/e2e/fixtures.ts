import type { ElectronApplication, Page, TestInfo } from '@playwright/test';

import { _electron as electron } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';
import { type Server } from 'node:net';
import { join } from 'node:path';
import { createBdd, test as base } from 'playwright-bdd';

import type { KeyProbeStub } from './key-probe-stub';
import type { RuntimeStub } from './runtime-stub';
import type { ScriptedProvider } from './scripted-provider';
import type { SubscriptionTools } from './subscription-tools';

import { fakeKeyProbe } from './key-probe-stub';
import { dropServer, holdPort, LOOPBACK_HOSTS } from './loopback-ports';
import { theClipboardIsHeld } from './one-clipboard';
import { fakeLocalRuntime } from './runtime-stub';
import { scenarioUserDataDir } from './scenario-user-data';
import { fakeScriptedProvider } from './scripted-provider';
import { fakeSubscriptionTools } from './subscription-tools';
import { seededUsageHistoryWritten } from './usage-screen';

const appRoot = join(__dirname, '..');

export function inheritedEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}

/** Holds loopback ports away from recompose, the way a rival process on the machine would. */
export type PortSquatter = {
  take: (port: number) => Promise<void>;
  release: (port: number) => Promise<void>;
};

type ElectronFixtures = {
  /**
   * Holds the machine's one clipboard for a scenario tagged `@one-clipboard`.
   *
   * @summary It is automatic rather than asked for, because the copy and the read sit in different
   * steps and the hold has to span both. The tag is what says a scenario needs it, so a feature
   * file reads as the whole requirement.
   */
  oneClipboard: void;
  /**
   * Forgets everything the last scenario scripted, before this one arranges anything.
   *
   * @summary The provider outlives one scenario, so a fixture left behind would answer the next
   * one's first attempt. It is automatic because a scenario that never scripts an answer is
   * exactly the one a leftover would fool.
   */
  aFreshScript: void;
  electronApp: ElectronApplication;
  keyProbe: KeyProbeStub;
  localRuntime: RuntimeStub;
  page: Page;
  portSquatter: PortSquatter;
  subscriptionTools: SubscriptionTools;
};

/**
 * The stand-ins one worker keeps standing across every scenario it runs.
 *
 * @summary The scripted provider costs a whole HTTP server, and a worker runs its scenarios one at
 * a time, so one per worker is enough. What it costs instead is the memory of the last scenario,
 * which `aFreshScript` takes away before the next one arranges anything.
 */
type WorkerStandIns = {
  scriptedProvider: ScriptedProvider;
};

/**
 * Where this scenario's targets are spent: the provider it scripts, or the probe.
 *
 * @summary A router offers one request to several children in turn, which the probe cannot answer
 * differently for each. The whole routers tree needs the scripted provider and nothing else does,
 * so the tree a scenario stands in is what decides. Deciding it by tag instead would mean writing
 * a tag into every approved scenario, and graduation copies those unchanged.
 */
function servingOriginFor(
  testInfo: TestInfo,
  keyProbe: KeyProbeStub,
  scriptedProvider: ScriptedProvider,
): string {
  return testInfo.file.includes(join('features', 'routers'))
    ? scriptedProvider.origin
    : keyProbe.origin;
}

async function takePort(held: Map<number, Server[]>, port: number): Promise<void> {
  const holders = await Promise.all(LOOPBACK_HOSTS.map(async (host) => holdPort(host, port)));
  const bound = holders.filter((holder): holder is Server => holder !== null);

  if (bound.length === 0) {
    throw new Error(`the scenario could not take port ${String(port)} away from recompose`);
  }

  held.set(port, bound);
}

async function releasePort(held: Map<number, Server[]>, port: number): Promise<void> {
  const bound = held.get(port) ?? [];

  held.delete(port);

  await Promise.all(bound.map(dropServer));
}

function platformHoldsLoginItem(): boolean {
  return process.platform === 'darwin' || process.platform === 'win32';
}

async function readLoginItem(app: ElectronApplication): Promise<boolean | null> {
  if (!platformHoldsLoginItem()) {
    return null;
  }

  return app.evaluate(
    ({ app: runningApp }) =>
      runningApp.getLoginItemSettings({ path: process.execPath, args: [] }).openAtLogin,
  );
}

async function restoreLoginItem(
  app: ElectronApplication,
  openAtLogin: boolean | null,
): Promise<void> {
  if (openAtLogin === null) {
    return;
  }

  await app.evaluate(({ app: runningApp }, enabled) => {
    const target = { path: process.execPath, args: [] };

    if (runningApp.getLoginItemSettings(target).openAtLogin === enabled) {
      return;
    }

    runningApp.setLoginItemSettings({ ...target, openAtLogin: enabled });
  }, openAtLogin);
}

export const test = base.extend<ElectronFixtures, WorkerStandIns>({
  oneClipboard: [
    async ({ $tags }, use) => {
      const letGo = $tags.includes('@one-clipboard') ? await theClipboardIsHeld() : null;

      try {
        await use();
      } finally {
        await letGo?.();
      }
    },
    { auto: true },
  ],
  scriptedProvider: [
    async ({}, use) => {
      const provider = await fakeScriptedProvider();

      try {
        await use(provider);
      } finally {
        await provider.dispose();
      }
    },
    { scope: 'worker' },
  ],
  aFreshScript: [
    async ({ scriptedProvider }, use) => {
      scriptedProvider.forgets();

      await use();
    },
    { auto: true },
  ],
  subscriptionTools: async ({}, use) => {
    const tools = await fakeSubscriptionTools();

    try {
      await use(tools);
    } finally {
      await tools.dispose();
    }
  },
  keyProbe: async ({}, use) => {
    const probe = await fakeKeyProbe();

    try {
      await use(probe);
    } finally {
      await probe.dispose();
    }
  },
  localRuntime: async ({}, use) => {
    const runtime = await fakeLocalRuntime();

    try {
      await use(runtime);
    } finally {
      await runtime.dispose();
    }
  },
  electronApp: async (
    { $tags, keyProbe, localRuntime, scriptedProvider, subscriptionTools },
    use,
    testInfo,
  ) => {
    const userDataDir = scenarioUserDataDir(appRoot, testInfo.parallelIndex);

    await rm(userDataDir, { force: true, recursive: true });
    await mkdir(userDataDir, { recursive: true });

    if ($tags.includes('@seeded-usage-history')) {
      await seededUsageHistoryWritten(userDataDir);
    }

    const app = await electron.launch({
      args: [appRoot],
      env: subscriptionTools.env({
        ...inheritedEnv(),
        NODE_ENV: 'production',
        ELECTRON_RENDERER_URL: '',
        RECOMPOSE_USER_DATA_DIR: userDataDir,
        RECOMPOSE_PROBE_ORIGIN: keyProbe.origin,
        RECOMPOSE_SERVING_ORIGIN: servingOriginFor(testInfo, keyProbe, scriptedProvider),
        RECOMPOSE_CONTROL_ORIGIN: keyProbe.origin,
        ...($tags.includes('@probes-the-minted-address')
          ? {}
          : { RECOMPOSE_RUNTIME_ORIGIN: localRuntime.origin }),
        ...(process.env['CI'] === undefined ? { RECOMPOSE_WINDOW_STAYS_BACK: '1' } : {}),
      }),
    });

    app.process().stderr?.on('data', (chunk: Buffer) => {
      process.stderr.write(chunk);
    });

    try {
      const priorLoginItem = await readLoginItem(app);

      try {
        await use(app);
      } finally {
        await restoreLoginItem(app, priorLoginItem);
      }
    } finally {
      await app.close();
      await rm(userDataDir, { force: true, recursive: true });
    }
  },
  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();

    await page.emulateMedia({ colorScheme: null });

    await page.waitForLoadState('domcontentloaded');
    await use(page);
  },
  portSquatter: async ({}, use) => {
    const held = new Map<number, Server[]>();

    try {
      await use({
        take: async (port) => takePort(held, port),
        release: async (port) => releasePort(held, port),
      });
    } finally {
      await Promise.all([...held.keys()].map(async (port) => releasePort(held, port)));
    }
  },
});

export const { Given, When, Then } = createBdd(test);
