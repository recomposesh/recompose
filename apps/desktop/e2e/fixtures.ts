import type { ElectronApplication, Page, TestInfo } from '@playwright/test';

import { _electron as electron } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createBdd, test as base } from 'playwright-bdd';

import type { JudgeStub } from './judge-stub';
import type { KeyProbeStub } from './key-probe-stub';
import type { PortSquatter } from './port-squatter';
import type { PriceMapStub } from './price-map-stub';
import type { RuntimeStub } from './runtime-stub';
import type { ScriptedProvider } from './scripted-provider';
import type { SubscriptionTools } from './subscription-tools';

import { fakeJudge } from './judge-stub';
import { fakeKeyProbe } from './key-probe-stub';
import { pinWindowFor, scenarioEnv } from './launch-environment';
import { readLoginItem, restoreLoginItem } from './login-item-guard';
import { theClipboardIsHeld } from './one-clipboard';
import { portsHeldFromRecompose } from './port-squatter';
import { fakePriceMap } from './price-map-stub';
import { fakeLocalRuntime } from './runtime-stub';
import { scenarioUserDataDir } from './scenario-user-data';
import { fakeScriptedProvider } from './scripted-provider';
import { settledSetupWritten } from './settled-setup';
import { fakeSubscriptionTools } from './subscription-tools';
import {
  updatesArrangementFor,
  type UpdateFeed,
  type UpdatesArrangement,
} from './update-feed-stub';
import { seededSubscriptionBurnWritten, seededUsageHistoryWritten } from './usage-screen';

const appRoot = join(__dirname, '..');

export { inheritedEnv } from './launch-environment';

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
   * @summary Both stand-ins outlive one scenario, so a fixture left behind would answer the next
   * one's first attempt and a call already counted would read as this scenario's. It is automatic
   * because a scenario that never scripts an answer is exactly the one a leftover would fool.
   */
  aFreshScript: void;
  electronApp: ElectronApplication;
  keyProbe: KeyProbeStub;
  priceMap: PriceMapStub;
  localRuntime: RuntimeStub;
  /** Everything the main process printed, for the scenarios that read the log back. */
  mainLog: string[];
  page: Page;
  portSquatter: PortSquatter;
  subscriptionTools: SubscriptionTools;
  updateFeed: UpdateFeed;
  /**
   * The release feed and environment an updates scenario arranged before its app launched.
   *
   * @summary The generated specs open every fixture ahead of the first step, so a Given can never
   * run before the launch. Tags carry the arrangement instead, the way seeded usage history
   * already arrives.
   */
  updatesArrangement: UpdatesArrangement | null;
};

/**
 * The stand-ins one worker keeps standing across every scenario it runs.
 *
 * @summary The scripted provider costs a whole HTTP server, and a worker runs its scenarios one at
 * a time, so one per worker is enough. What it costs instead is the memory of the last scenario,
 * which `aFreshScript` takes away before the next one arranges anything.
 */
type WorkerStandIns = {
  /**
   * The judge a conditional scenario binds, standing at an origin no branch child answers at.
   *
   * @summary A conditional router spends a classification call and a served request on one request,
   * and both would reach the scripted provider under one origin. A second origin is what tells them
   * apart, which is what a scenario proving no classification call left the machine rests on.
   */
  judge: JudgeStub;
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
async function scenarioDataDirPrepared(testInfo: TestInfo, tags: string[]): Promise<string> {
  const userDataDir = scenarioUserDataDir(appRoot, testInfo.parallelIndex);

  await rm(userDataDir, { force: true, recursive: true });
  await mkdir(userDataDir, { recursive: true });

  if (!tags.includes('@fresh-profile')) {
    await settledSetupWritten(userDataDir);
  }

  if (tags.includes('@seeded-usage-history')) {
    await seededUsageHistoryWritten(userDataDir);
  }

  if (tags.includes('@seeded-subscription-burn')) {
    await seededSubscriptionBurnWritten(userDataDir);
  }

  return userDataDir;
}

function heardMainProcess(app: ElectronApplication, mainLog: string[]): void {
  app.process().stderr?.on('data', (chunk: Buffer) => {
    mainLog.push(chunk.toString());
    process.stderr.write(chunk);
  });
  app.process().stdout?.on('data', (chunk: Buffer) => {
    mainLog.push(chunk.toString());
  });
}

function servingOriginFor(
  testInfo: TestInfo,
  keyProbe: KeyProbeStub,
  scriptedProvider: ScriptedProvider,
): string {
  return testInfo.file.includes(join('features', 'routers'))
    ? scriptedProvider.origin
    : keyProbe.origin;
}

/**
 * A stub that stands for one scenario and is taken down after it, whatever it stood for.
 *
 * @summary Six fixtures raised a stub, handed it over, and disposed of it in a `finally`. The
 * shape is the same every time, and writing it out six times said nothing the sixth time it had
 * not said the first.
 */
function standingFor<T extends { dispose: () => Promise<void> }>(
  raise: () => Promise<T>,
): (deps: object, use: (value: T) => Promise<void>) => Promise<void> {
  return async (_deps, use) => {
    const stub = await raise();

    try {
      await use(stub);
    } finally {
      await stub.dispose();
    }
  };
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
  scriptedProvider: [standingFor(fakeScriptedProvider), { scope: 'worker' }],
  judge: [standingFor(fakeJudge), { scope: 'worker' }],
  aFreshScript: [
    async ({ judge, scriptedProvider }, use) => {
      scriptedProvider.forgets();
      judge.forgets();

      await use();
    },
    { auto: true },
  ],
  subscriptionTools: standingFor(fakeSubscriptionTools),
  keyProbe: standingFor(fakeKeyProbe),
  priceMap: standingFor(fakePriceMap),
  localRuntime: standingFor(fakeLocalRuntime),
  mainLog: async ({}, use) => {
    await use([]);
  },
  updatesArrangement: async ({ $tags }, use, testInfo) => {
    const arrangement = await updatesArrangementFor(testInfo.file, $tags);

    try {
      await use(arrangement);
    } finally {
      await arrangement?.feed.dispose();
    }
  },
  updateFeed: async ({ updatesArrangement }, use) => {
    if (updatesArrangement === null) {
      throw new Error('this scenario carries no @update-feed tag, so no feed stands for it');
    }

    await use(updatesArrangement.feed);
  },
  electronApp: async (
    {
      $tags,
      keyProbe,
      localRuntime,
      priceMap,
      mainLog,
      scriptedProvider,
      subscriptionTools,
      updatesArrangement,
    },
    use,
    testInfo,
  ) => {
    const userDataDir = await scenarioDataDirPrepared(testInfo, $tags);

    const app = await electron.launch({
      args: [appRoot],
      env: subscriptionTools.env(
        scenarioEnv({
          tags: $tags,
          userDataDir,
          probeOrigin: keyProbe.origin,
          priceOrigin: priceMap.origin,
          servingOrigin: servingOriginFor(testInfo, keyProbe, scriptedProvider),
          runtimeOrigin: localRuntime.origin,
          launchEnv: { ...pinWindowFor(testInfo.file), ...updatesArrangement?.env },
        }),
      ),
    });

    heardMainProcess(app, mainLog);

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
    const held = portsHeldFromRecompose();

    try {
      await use(held.squatter);
    } finally {
      await held.letEveryPortGo();
    }
  },
});

export const { Given, When, Then } = createBdd(test);
