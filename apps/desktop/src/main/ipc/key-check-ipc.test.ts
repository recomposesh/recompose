import type { KeyCheckReport } from '@recompose/contracts';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  checkCodec,
  checkedSecret as secret,
  checkHandlersOver,
  connectKeyIn as connectKey,
  tempKeyStorage as tempStorage,
} from './key-check-ipc.testkit';

function checkOver(userDataPath: string, answerProbe: () => KeyCheckReport | null) {
  return checkHandlersOver(userDataPath, checkCodec, answerProbe);
}

describe('the key check answers each verdict the child reports', () => {
  test('a key the vendor accepts answers authenticates', async () => {
    const userDataPath = await tempStorage();
    const id = await connectKey(userDataPath);
    const { handlers } = checkOver(userDataPath, () => ({ verdict: 'authenticates', status: 200 }));

    await expect(handlers['accounts:check-key']({ id })).resolves.toEqual({
      ok: true,
      value: { verdict: 'authenticates', status: 200 },
    });
  });

  test('a key the vendor turns away answers not-accepted', async () => {
    const userDataPath = await tempStorage();
    const id = await connectKey(userDataPath);
    const { handlers } = checkOver(userDataPath, () => ({ verdict: 'not-accepted', status: 401 }));

    await expect(handlers['accounts:check-key']({ id })).resolves.toEqual({
      ok: true,
      value: { verdict: 'not-accepted', status: 401 },
    });
  });

  test('a check the child cannot run answers could-not-check', async () => {
    const userDataPath = await tempStorage();
    const id = await connectKey(userDataPath);
    const { handlers } = checkOver(userDataPath, () => ({ verdict: 'could-not-check' }));

    await expect(handlers['accounts:check-key']({ id })).resolves.toEqual({
      ok: true,
      value: { verdict: 'could-not-check' },
    });
  });
});

describe('what the probe directive carries', () => {
  test('the probe hears the decrypted secret rather than what the vault stores', async () => {
    const userDataPath = await tempStorage();
    const id = await connectKey(userDataPath);
    const { handlers, scripted } = checkOver(userDataPath, () => ({
      verdict: 'authenticates',
      status: 200,
    }));

    await handlers['accounts:check-key']({ id });

    expect(scripted.directives).toMatchObject([
      {
        kind: 'probe',
        origin: 'https://api.anthropic.com',
        custody: { custody: 'provider-key', provider: 'anthropic', credential: secret },
      },
    ]);
  });

  test('the check probes the row it was asked about, not the first row', async () => {
    const userDataPath = await tempStorage();

    await connectKey(userDataPath, 'anthropic');

    const asked = await connectKey(userDataPath, 'openai');
    const { handlers, scripted } = checkOver(userDataPath, () => ({
      verdict: 'authenticates',
      status: 200,
    }));

    await handlers['accounts:check-key']({ id: asked });

    expect(scripted.directives).toMatchObject([
      { kind: 'probe', origin: 'https://api.openai.com', custody: { provider: 'openai' } },
    ]);
  });
});

describe('the key check refuses what it cannot probe', () => {
  test('a missing row answers a typed refusal naming the id', async () => {
    const { handlers } = checkOver(await tempStorage(), () => null);

    const refused = await handlers['accounts:check-key']({ id: 'acc-ghost' });

    expect(refused).toMatchObject({ ok: false, error: { code: 'storage-failed' } });

    if (refused.ok) {
      throw new Error('expected a refusal');
    }

    expect(refused.error.message).toContain('acc-ghost');
  });

  test('a provider only a plugin serves answers a typed refusal', async () => {
    const userDataPath = await tempStorage();
    const id = await connectKey(userDataPath, 'a-plugin-vendor');
    const { handlers, scripted } = checkOver(userDataPath, () => null);

    const refused = await handlers['accounts:check-key']({ id });

    expect(refused).toMatchObject({ ok: false, error: { code: 'validation-failed' } });

    if (refused.ok) {
      throw new Error('expected a refusal');
    }

    expect(refused.error.message).toContain('a-plugin-vendor');
    expect(scripted.directives).toEqual([]);
  });

  test('a subscription row refuses as no key account rather than probing', async () => {
    const userDataPath = await tempStorage();

    await writeFile(
      join(userDataPath, 'accounts.json'),
      JSON.stringify({
        schemaVersion: 3,
        accounts: [{ id: 'sub-one', provider: 'anthropic', kind: 'subscription', label: 'Max' }],
      }),
      'utf8',
    );

    const { handlers } = checkOver(userDataPath, () => null);

    const refused = await handlers['accounts:check-key']({ id: 'sub-one' });

    expect(refused).toMatchObject({ ok: false, error: { code: 'storage-failed' } });

    if (refused.ok) {
      throw new Error('expected a refusal');
    }

    expect(refused.error.message).toContain('no key account');
  });
});
