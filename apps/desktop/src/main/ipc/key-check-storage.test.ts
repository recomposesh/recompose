import type { KeyCheckReport } from '@recompose/contracts';

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { PROBE_TIMEOUT_MS } from '../engine-host/engine-host';
import { hostOver, nothing, scriptedChild } from '../engine-host/engine-host.testkit';
import { createKeyCheckIpcHandlers, keyCheckReach } from './key-check-ipc';
import {
  checkCodec,
  checkedSecret as secret,
  checkHandlersOver,
  connectKeyIn as connectKey,
  storageContextOver,
  tempKeyStorage as tempStorage,
} from './key-check-ipc.testkit';
import { createStorageIpcHandlers } from './storage-ipc';

function checkOver(userDataPath: string, answerProbe: () => KeyCheckReport | null) {
  return checkHandlersOver(userDataPath, checkCodec, answerProbe);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the key check refuses storage it cannot read', () => {
  test('a row whose vault entry is missing answers a typed refusal', async () => {
    const userDataPath = await tempStorage();

    await writeFile(
      join(userDataPath, 'accounts.json'),
      JSON.stringify({
        schemaVersion: 3,
        accounts: [
          {
            id: 'acc-orphan',
            provider: 'anthropic',
            kind: 'api-key',
            label: 'build',
            credentialRef: 'cred-ghost',
          },
        ],
      }),
      'utf8',
    );

    const { handlers } = checkOver(userDataPath, () => null);

    const refused = await handlers['accounts:check-key']({ id: 'acc-orphan' });

    expect(refused).toMatchObject({ ok: false, error: { code: 'storage-failed' } });

    if (refused.ok) {
      throw new Error('expected a refusal');
    }

    expect(refused.error.message).toContain('vault');
  });

  test('a newer vault schema during a check refuses as vault-newer-schema', async () => {
    const userDataPath = await tempStorage();
    const id = await connectKey(userDataPath);

    await writeFile(
      join(userDataPath, 'vault.bin'),
      JSON.stringify({ schemaVersion: 2, entries: {} }),
      'utf8',
    );

    const { handlers } = checkOver(userDataPath, () => null);

    const refused = await handlers['accounts:check-key']({ id });

    expect(refused).toMatchObject({ ok: false, error: { code: 'vault-newer-schema' } });
  });

  test('an unreadable registry during a check refuses as storage-failed', async () => {
    const userDataPath = await tempStorage();

    await mkdir(join(userDataPath, 'accounts.json'));

    const { handlers } = checkOver(userDataPath, () => null);

    const refused = await handlers['accounts:check-key']({ id: 'acc-any' });

    expect(refused).toMatchObject({ ok: false, error: { code: 'storage-failed' } });
  });
});

describe('where the check stands in the vault queue', () => {
  test('the probe waits outside the queue, so a connect never queues behind it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const userDataPath = await tempStorage();
    const id = await connectKey(userDataPath);
    const { handlers } = checkOver(userDataPath, () => null);

    vi.useFakeTimers();

    const checking = handlers['accounts:check-key']({ id });
    const storage = createStorageIpcHandlers(storageContextOver(userDataPath));

    const connected = await storage['accounts:connect']({
      provider: 'openai',
      kind: 'api-key',
      label: 'deploy',
      secret: 'sk-openai-long-secret-1a2b',
    });

    expect(connected).toMatchObject({ ok: true });

    await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS);

    await expect(checking).resolves.toEqual({
      ok: true,
      value: { verdict: 'could-not-check' },
    });
  });
});

describe('the reach a check is given over the engine', () => {
  test('the check probes through the engine it was reached to', async () => {
    const userDataPath = await tempStorage();
    const id = await connectKey(userDataPath);
    const scripted = scriptedChild(nothing, () => ({ verdict: 'authenticates', status: 200 }));
    const { host } = hostOver(scripted);
    const handlers = createKeyCheckIpcHandlers(
      keyCheckReach(
        {
          userDataPath,
          homeFolder: '/Users/ada',
          getCodec: () => checkCodec,
          onCorrupt: () => undefined,
        },
        host,
      ),
    );

    await expect(handlers['accounts:check-key']({ id })).resolves.toEqual({
      ok: true,
      value: { verdict: 'authenticates', status: 200 },
    });

    expect(scripted.directives).toMatchObject([
      {
        kind: 'probe',
        origin: 'https://api.anthropic.com',
        custody: { custody: 'provider-key', provider: 'anthropic', credential: secret },
      },
    ]);
  });
});

describe('the probe leg of a check', () => {
  test('a probe that dies answers a typed refusal with the home folder scrubbed', async () => {
    const userDataPath = await tempStorage();
    const id = await connectKey(userDataPath);
    const handlers = createKeyCheckIpcHandlers({
      userDataPath,
      homeFolder: '/Users/ada',
      getCodec: () => checkCodec,
      onCorrupt: () => undefined,
      probe: async () => Promise.reject(new Error('the child died reading /Users/ada/library')),
    });

    const answer = await handlers['accounts:check-key']({ id });

    expect(answer).toMatchObject({ ok: false, error: { code: 'storage-failed' } });
    expect(JSON.stringify(answer)).not.toContain('/Users/ada');
  });
});
