import { defaultSettings, type Settings } from '@recompose/contracts';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import type { SecretCodec } from '../storage/safe-storage-codec';
import type { StorageIpcContext } from './storage-context';

import { subscriptionHomes } from '../subscriptions/subscription-homes';
import { subscriptionRelease } from '../subscriptions/subscription-release';
import { createStorageIpcHandlers } from './storage-ipc';

const fakeCodec: SecretCodec = {
  encrypt: (plain) => Buffer.from(plain, 'utf8').toString('base64'),
  decrypt: (encrypted) => Buffer.from(encrypted, 'base64').toString('utf8'),
  isPlaintextFallback: false,
};

async function freshContext(
  overrides: Partial<StorageIpcContext> = {},
): Promise<StorageIpcContext> {
  const userDataPath = await mkdtemp(join(tmpdir(), 'recompose-ipc-settings-'));

  return {
    userDataPath,
    homeFolder: '/Users/ada',
    getCodec: () => fakeCodec,
    isEncryptionAvailable: () => true,
    onCorrupt: () => undefined,
    applySettings: () => undefined,
    onSettingsWritten: () => undefined,
    readLoginItem: () => false,
    startGateway: () => undefined,
    restartGateway: () => undefined,
    stopGateway: () => undefined,
    isServing: () => true,
    releaseSubscription: subscriptionRelease(
      subscriptionHomes(userDataPath, process.platform),
      null,
    ),
    ...overrides,
  };
}

const changedSettings: Settings = { ...defaultSettings(), theme: 'dark', showInMenuBar: true };

describe('storage ipc handlers: settings', () => {
  test('settings default on first read and persist on save', async () => {
    const handlers = createStorageIpcHandlers(await freshContext());

    const first = await handlers['settings:get'](undefined);
    const written = await handlers['settings:save'](changedSettings);
    const second = await handlers['settings:get'](undefined);

    expect(first).toMatchObject({ ok: true, value: { theme: 'system', showInMenuBar: false } });
    expect(written).toEqual(second);
  });

  test('a stored document reaches the seam that applies it outside the window', async () => {
    const applied: Settings[] = [];
    const handlers = createStorageIpcHandlers(
      await freshContext({
        applySettings: (settings) => {
          applied.push(settings);
        },
      }),
    );

    await handlers['settings:save'](changedSettings);

    expect(applied).toEqual([changedSettings]);
  });
});

describe('how a settings save is reported', () => {
  test('a saved document is reported, so every window and the menu hear about it', async () => {
    const reported: Settings[] = [];
    const handlers = createStorageIpcHandlers(
      await freshContext({
        onSettingsWritten: (settings) => {
          reported.push(settings);
        },
      }),
    );

    await handlers['settings:save'](changedSettings);

    expect(reported).toEqual([changedSettings]);
  });

  test('a document that never reached the disk applies nothing and reports nothing', async () => {
    const blockingDir = await mkdtemp(join(tmpdir(), 'recompose-ipc-unapplied-'));
    const blockingPath = join(blockingDir, 'not-a-directory');

    await writeFile(blockingPath, '', 'utf8');

    const applied: Settings[] = [];
    const reported: Settings[] = [];
    const handlers = createStorageIpcHandlers(
      await freshContext({
        userDataPath: blockingPath,
        homeFolder: '/Users/ada',
        applySettings: (settings) => {
          applied.push(settings);
        },
        onSettingsWritten: (settings) => {
          reported.push(settings);
        },
      }),
    );

    await handlers['settings:save'](changedSettings);

    expect(applied).toEqual([]);
    expect(reported).toEqual([]);
  });
});

async function restartCountingDesk() {
  let restarts = 0;
  const context = await freshContext({
    restartServingGateways: () => {
      restarts += 1;
    },
  });

  return { context, handlers: createStorageIpcHandlers(context), restarts: () => restarts };
}

describe('moving the gateway bind address', () => {
  test('a save that moves the bind address restarts the serving gateways', async () => {
    const desk = await restartCountingDesk();

    await desk.handlers['settings:save']({ ...defaultSettings(), bindAddress: '0.0.0.0' });

    expect(desk.restarts()).toBe(1);
  });

  test('a save that keeps the stored bind address restarts nothing', async () => {
    const desk = await restartCountingDesk();

    await desk.handlers['settings:save'](changedSettings);

    expect(desk.restarts()).toBe(0);
  });

  test('a stored document naming no bind address stands for the default, so saving the default moves nothing', async () => {
    const desk = await restartCountingDesk();
    const { bindAddress: _unspoken, ...documentNamingNoBindAddress } = defaultSettings();

    await writeFile(
      join(desk.context.userDataPath, 'settings.json'),
      JSON.stringify(documentNamingNoBindAddress),
      'utf8',
    );

    await desk.handlers['settings:save'](defaultSettings());

    expect(desk.restarts()).toBe(0);
  });

  test('a desk without the restart seam still answers a moved bind address whole', async () => {
    const handlers = createStorageIpcHandlers(await freshContext());

    const answer = await handlers['settings:save']({
      ...defaultSettings(),
      bindAddress: '0.0.0.0',
    });

    expect(answer).toMatchObject({ ok: true, value: { bindAddress: '0.0.0.0' } });
  });
});
