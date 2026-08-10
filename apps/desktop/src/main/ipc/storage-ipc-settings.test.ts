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
