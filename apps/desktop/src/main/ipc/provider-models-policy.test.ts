import type { ModelListing } from '@recompose/contracts';

import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import type { ProviderModelsIpcContext } from './provider-models-ipc';

import { contextFor, keyRow, storageHolding } from '../engine-host/spend-grant.testkit';
import { createProviderModelsIpcHandlers } from './provider-models-ipc';

describe('provider model policy at the account model-list boundary', () => {
  test('excluded models are filtered case-insensitively without applying router aliases', async () => {
    const userDataPath = await storageHolding([], [keyRow]);

    await writePolicy(userDataPath, [' MODEL-B ', 'model-c']);
    const listing: ModelListing = {
      standing: 'listed',
      models: [{ id: 'model-a' }, { id: 'model-b' }, { id: 'MODEL-C' }],
    };
    const handlers = createProviderModelsIpcHandlers(contextListing(userDataPath, listing));

    await expect(handlers['accounts:list-models']({ id: keyRow.id })).resolves.toEqual({
      ok: true,
      value: { standing: 'listed', models: [{ id: 'model-a' }] },
    });
  });

  test('filtering every model preserves the listed-empty distinction', async () => {
    const userDataPath = await storageHolding([], [keyRow]);

    await writePolicy(userDataPath, ['model-a']);
    const handlers = createProviderModelsIpcHandlers(
      contextListing(userDataPath, { standing: 'listed', models: [{ id: 'model-a' }] }),
    );

    await expect(handlers['accounts:list-models']({ id: keyRow.id })).resolves.toEqual({
      ok: true,
      value: { standing: 'listed', models: [] },
    });
  });

  test('a model kept by the policy keeps the shutdown date its provider announced', async () => {
    const userDataPath = await storageHolding([], [keyRow]);

    await writePolicy(userDataPath, ['model-b']);
    const listing: ModelListing = {
      standing: 'listed',
      models: [{ id: 'model-a', shutdownDate: '2026-12-11' }, { id: 'model-b' }],
    };
    const handlers = createProviderModelsIpcHandlers(contextListing(userDataPath, listing));

    await expect(handlers['accounts:list-models']({ id: keyRow.id })).resolves.toEqual({
      ok: true,
      value: { standing: 'listed', models: [{ id: 'model-a', shutdownDate: '2026-12-11' }] },
    });
  });
});

function contextListing(userDataPath: string, listing: ModelListing): ProviderModelsIpcContext {
  return {
    ...contextFor(userDataPath),
    listModels: async () => Promise.resolve(listing),
  };
}

async function writePolicy(userDataPath: string, excludedModels: readonly string[]): Promise<void> {
  await writeFile(
    join(userDataPath, 'accounts.json'),
    JSON.stringify({
      schemaVersion: ACCOUNTS_VERSION,
      accounts: [keyRow],
      modelPolicies: {
        Anthropic: {
          excludedModels,
          aliases: [{ name: 'model-a', alias: 'friendly', displayName: 'Friendly' }],
        },
      },
    }),
    'utf8',
  );
}
