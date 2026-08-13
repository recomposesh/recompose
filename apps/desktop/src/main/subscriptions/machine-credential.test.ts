import { describe, expect, test } from 'vitest';

import type { MachineStore } from './machine-credential';

import { KeychainDenied } from './credential-custody';
import { machineCredentialMaterial, readMachineCredential } from './machine-credential';

const aClaudeLogin = JSON.stringify({
  claudeAiOauth: { accessToken: 'opaque', subscriptionType: 'max', expiresAt: 4102444800000 },
});

const anExpiredClaudeLogin = JSON.stringify({
  claudeAiOauth: { accessToken: 'opaque', subscriptionType: 'max', expiresAt: 1 },
});

const anMcpRecordAlone = JSON.stringify({ mcpOAuth: { server: { accessToken: 'opaque' } } });

const anIdentity = JSON.stringify({ oauthAccount: { emailAddress: 'ada@ex.com' } });

function aStore(over: Partial<MachineStore> = {}): MachineStore {
  return {
    readBlob: async () => Promise.resolve(null),
    readIdentity: async () => Promise.resolve(null),
    ...over,
  };
}

describe('what the machine already holds for a provider', () => {
  test('given the tool signed in, the reading names the address and the plan', async () => {
    const reading = await readMachineCredential('anthropic', {
      readBlob: async () => Promise.resolve(aClaudeLogin),
      readIdentity: async () => Promise.resolve(anIdentity),
    });

    expect(reading).toEqual({
      holds: 'account',
      signedInAs: 'ada@ex.com',
      plan: 'max',
      standing: 'connected',
    });
  });

  test('given nothing on the machine, the reading says the machine holds nothing', async () => {
    await expect(readMachineCredential('anthropic', aStore())).resolves.toEqual({
      holds: 'nothing',
    });
  });

  test('given a record carrying no account credential, the reading says so rather than nothing', async () => {
    const reading = await readMachineCredential(
      'anthropic',
      aStore({ readBlob: async () => Promise.resolve(anMcpRecordAlone) }),
    );

    expect(reading).toEqual({ holds: 'no-account-credential' });
  });

  test('given the store refuses to open, the reading says so rather than nothing', async () => {
    const reading = await readMachineCredential(
      'anthropic',
      aStore({
        readBlob: async () => Promise.reject(new KeychainDenied('the keychain prompt was denied')),
      }),
    );

    expect(reading).toEqual({ holds: 'store-refused' });
  });

  test('given a credential past its expiry, the reading holds an account that lapsed', async () => {
    const reading = await readMachineCredential('anthropic', {
      readBlob: async () => Promise.resolve(anExpiredClaudeLogin),
      readIdentity: async () => Promise.resolve(anIdentity),
    });

    expect(reading).toMatchObject({ holds: 'account', standing: 'lapsed' });
  });

  test('given no identity file, the reading still names the account by its plan alone', async () => {
    const reading = await readMachineCredential(
      'anthropic',
      aStore({ readBlob: async () => Promise.resolve(aClaudeLogin) }),
    );

    expect(reading).toEqual({ holds: 'account', plan: 'max', standing: 'connected' });
  });
});

describe('what the machine holds for Codex', () => {
  test('given a Codex record in key mode, the reading refuses it as a subscription', async () => {
    const reading = await readMachineCredential(
      'openai',
      aStore({
        readBlob: async () =>
          Promise.resolve(JSON.stringify({ auth_mode: 'ApiKey', OPENAI_API_KEY: 'sk-opaque' })),
      }),
    );

    expect(reading).toEqual({ holds: 'no-account-credential' });
  });

  test('given a Codex subscription, the reading names the address and plan from its session', async () => {
    const claims = Buffer.from(
      JSON.stringify({
        email: 'ada@ex.com',
        'https://api.openai.com/auth': { chatgpt_plan_type: 'plus' },
      }),
    ).toString('base64url');
    const reading = await readMachineCredential(
      'openai',
      aStore({
        readBlob: async () =>
          Promise.resolve(
            JSON.stringify({
              tokens: { access_token: 'opaque', id_token: `header.${claims}.signature` },
            }),
          ),
      }),
    );

    expect(reading).toMatchObject({ holds: 'account', signedInAs: 'ada@ex.com', plan: 'plus' });
  });

  test('given a blob that is not readable at all, the reading says the machine holds nothing', async () => {
    const reading = await readMachineCredential(
      'anthropic',
      aStore({ readBlob: async () => Promise.resolve('not json') }),
    );

    expect(reading).toEqual({ holds: 'no-account-credential' });
  });
});

describe('the material a person asked to adopt', () => {
  test('given the tool signed in, the material hands back the credential itself', async () => {
    const material = await machineCredentialMaterial('anthropic', {
      readBlob: async () => Promise.resolve(aClaudeLogin),
      readIdentity: async () => Promise.resolve(anIdentity),
    });

    expect(material).toEqual({
      blob: aClaudeLogin,
      signedInAs: 'ada@ex.com',
      plan: 'max',
    });
  });

  test('given nothing to adopt, the material answers nothing rather than an empty credential', async () => {
    await expect(machineCredentialMaterial('anthropic', aStore())).resolves.toBeNull();
  });

  test('given a record carrying no account credential, the material answers nothing', async () => {
    const material = await machineCredentialMaterial(
      'anthropic',
      aStore({ readBlob: async () => Promise.resolve(anMcpRecordAlone) }),
    );

    expect(material).toBeNull();
  });

  test('given the store refuses, the material carries the refusal out rather than answering nothing', async () => {
    await expect(
      machineCredentialMaterial(
        'anthropic',
        aStore({
          readBlob: async () =>
            Promise.reject(new KeychainDenied('the keychain prompt was denied')),
        }),
      ),
    ).rejects.toThrow('denied');
  });
});
