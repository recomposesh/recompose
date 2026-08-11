import type { Page } from '@playwright/test';
import type { AccountsDocument, RecomposeIpc } from '@recompose/contracts';

import { chromium, expect, test } from '@playwright/test';
import { findLatestBuild, parseElectronApp } from 'electron-playwright-helpers';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

import {
  cableBetween,
  cableId,
  cablePath,
  GATEWAY_NODE,
  hitTarget,
  modelNodeId,
  nodeSeat,
  openGatewayCanvas,
  sourcePort,
  standingCables,
  standingNodes,
  targetNodeId,
  viewportZoom,
  wireId,
} from './canvas-screen';
import { seedGateway } from './gateway-screen';
import {
  assertNoEarlyFailure,
  createPackagedLaunchEnv,
  findRendererPage,
  noiseFrom,
  noSandboxArgs,
  trackChildFailure,
  waitForDevtoolsPort,
} from './packaged-launch';
import { bindingOf, offerVirtualModels } from './stored-virtual-models';

declare global {
  var recompose: RecomposeIpc;
}

const distDir = join(__dirname, '..', 'dist');

const FUSE_PROBE_WINDOW_MS = 2000;

const PACKAGED_GATEWAY = 'Codex';

const PACKAGED_MODEL = 'fast';

const PACKAGED_PROVIDER_MODEL = 'llama3.2';

/** What a port measures once the packaged stylesheet stands, which no policy may collapse. */
const PORT_MEASURE = { width: 24, height: 24 };

/** The one account kind that stores without a vault, which keeps the paint proof to the canvas. */
async function localAccountStands(page: Page): Promise<string> {
  const answer = await page.evaluate(async () =>
    window.recompose['accounts:connect-local']({ runtime: 'ollama' }),
  );

  if (!answer.ok) {
    throw new Error(`the packaged app connected no local runtime: ${answer.error.message}`);
  }

  const connected: AccountsDocument = answer.value;
  const account = connected.accounts.at(-1);

  if (account === undefined) {
    throw new Error('the packaged app stored no account to bind a virtual model to');
  }

  return account.id;
}

/** A gateway serving one virtual model over one stored account, which is a composition to draw. */
async function wiredGateway(page: Page): Promise<string> {
  const accountId = await localAccountStands(page);

  await seedGateway(page, PACKAGED_GATEWAY);

  const stored = await offerVirtualModels(page, PACKAGED_GATEWAY, [
    bindingOf(PACKAGED_MODEL, accountId, PACKAGED_PROVIDER_MODEL),
  ]);

  if (!stored.ok) {
    throw new Error(`the packaged app stored no binding: ${stored.message}`);
  }

  await page.reload();

  return accountId;
}

test('the packaged artifact boots from the asar on the app scheme', async () => {
  const appInfo = parseElectronApp(findLatestBuild(distDir));

  expect(appInfo.asar).toBe(true);

  const child = spawn(appInfo.executable, [...noSandboxArgs, '--remote-debugging-port=0'], {
    env: await createPackagedLaunchEnv({}),
  });
  const getSpawnFailure = trackChildFailure(child, 'packaged binary spawn');

  try {
    const port = await waitForDevtoolsPort(child, getSpawnFailure);
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${String(port)}`);

    try {
      const renderer = await findRendererPage(browser);

      const bridge = await renderer.evaluate(() => ({
        isFrozen: Object.isFrozen(globalThis.recompose),
      }));

      expect(bridge.isFrozen).toBe(true);
    } finally {
      await browser.close();
    }
  } finally {
    child.kill();
  }
});

/**
 * The canvas paints a whole composition under the style policy only the packaged build carries.
 *
 * @summary Serve mode allows an inline source and would hide the break, so this is the one place
 * the imperative viewport transform, the seats the cards stand at, and the line a cable draws are
 * all read from a renderer running the policy a person actually gets.
 */
test('the packaged canvas paints a wired gateway under the strict style policy', async () => {
  const appInfo = parseElectronApp(findLatestBuild(distDir));
  const child = spawn(appInfo.executable, [...noSandboxArgs, '--remote-debugging-port=0'], {
    env: await createPackagedLaunchEnv({}),
  });
  const getSpawnFailure = trackChildFailure(child, 'packaged canvas spawn');

  try {
    const port = await waitForDevtoolsPort(child, getSpawnFailure);
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${String(port)}`);

    try {
      const renderer = await findRendererPage(browser);
      const complaints = noiseFrom(renderer);

      await wiredGateway(renderer);

      await openGatewayCanvas(renderer, PACKAGED_GATEWAY);

      await expect
        .poll(async () => standingNodes(renderer))
        .toEqual([GATEWAY_NODE, modelNodeId(PACKAGED_MODEL), targetNodeId(PACKAGED_MODEL)]);
      expect(await standingCables(renderer)).toEqual([
        wireId(PACKAGED_MODEL),
        cableId(PACKAGED_MODEL),
      ]);
      expect(await cablePath(renderer, cableId(PACKAGED_MODEL))).not.toBe('');
      expect(await cablePath(renderer, wireId(PACKAGED_MODEL))).not.toBe('');
      await expect(
        cableBetween(renderer, modelNodeId(PACKAGED_MODEL), targetNodeId(PACKAGED_MODEL)),
      ).toBeVisible();
      expect((await nodeSeat(renderer, modelNodeId(PACKAGED_MODEL))).x).toBeGreaterThan(
        (await nodeSeat(renderer, GATEWAY_NODE)).x,
      );
      expect(await hitTarget(sourcePort(renderer, GATEWAY_NODE))).toEqual(PORT_MEASURE);
      expect(await viewportZoom(renderer)).toBeGreaterThan(0);
      expect(complaints()).toEqual([]);
    } finally {
      await browser.close();
    }
  } finally {
    child.kill();
  }
});

test('the run-as-node fuse stays flipped in the packaged binary', async () => {
  const appInfo = parseElectronApp(findLatestBuild(distDir));

  const child = spawn(appInfo.executable, ['-e', 'process.exit(97)'], {
    env: await createPackagedLaunchEnv({ ELECTRON_RUN_AS_NODE: '1' }),
  });
  const getSpawnFailure = trackChildFailure(child, 'run-as-node fuse probe spawn');

  child.stdout.on('data', () => {
    return undefined;
  });
  child.stderr.on('data', () => {
    return undefined;
  });

  try {
    await assertNoEarlyFailure(
      () =>
        getSpawnFailure() ??
        (child.exitCode === null ? null : `exited early with code ${String(child.exitCode)}`),
      FUSE_PROBE_WINDOW_MS,
    );
  } finally {
    child.kill();
  }
});

test('the inspect-cli-arguments fuse stays flipped in the packaged binary', async () => {
  const appInfo = parseElectronApp(findLatestBuild(distDir));

  const child = spawn(appInfo.executable, [...noSandboxArgs, '--inspect=0'], {
    env: await createPackagedLaunchEnv({}),
  });
  const getSpawnFailure = trackChildFailure(child, 'inspect-cli-arguments fuse probe spawn');

  let stderr = '';

  child.stdout.on('data', () => {
    return undefined;
  });
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  try {
    await assertNoEarlyFailure(
      () =>
        getSpawnFailure() ??
        (stderr.includes('Debugger listening')
          ? 'debugger listening line appeared on stderr'
          : null),
      FUSE_PROBE_WINDOW_MS,
    );
  } finally {
    child.kill();
  }
});
