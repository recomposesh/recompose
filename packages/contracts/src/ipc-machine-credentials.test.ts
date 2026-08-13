import { describe, expect, test } from 'vitest';

import { ipcChannels, ipcErrorSchema } from './ipc';

describe('the channels that read and adopt what the machine holds', () => {
  test('both name the provider whose store the app looks at, and carry no secret', () => {
    for (const channel of ['subscriptions:detect', 'subscriptions:adopt'] as const) {
      const request = ipcChannels[channel].request;

      expect(request.safeParse({ provider: 'anthropic' }).success).toBe(true);
      expect(request.safeParse({ provider: 'openrouter' }).success).toBe(false);
      expect(request.safeParse({ provider: 'anthropic', secret: 'sk' }).success).toBe(false);
    }
  });

  test('reading answers the account the machine holds', () => {
    const found = {
      ok: true,
      value: {
        holds: 'account',
        signedInAs: 'dev@example.com',
        plan: 'Max',
        standing: 'connected',
      },
    };

    expect(ipcChannels['subscriptions:detect'].response.parse(found)).toEqual(found);
  });

  test('reading answers a machine that holds nothing without inventing an account', () => {
    const empty = { ok: true, value: { holds: 'nothing' } };

    expect(ipcChannels['subscriptions:detect'].response.parse(empty)).toEqual(empty);
  });

  test('reading never answers with the material, so nothing a token fills crosses the bridge', () => {
    expect(() =>
      ipcChannels['subscriptions:detect'].response.parse({
        ok: true,
        value: { holds: 'account', standing: 'connected', credential: 'oauth-token' },
      }),
    ).toThrow();
  });
});

describe('the refusal an adopt answers when nothing stands there any longer', () => {
  test('adopting refuses when the credential went away between the look and the act', () => {
    const refusal = {
      ok: false,
      error: { code: 'nothing-to-adopt', message: 'the credential left the store' },
    };

    expect(ipcChannels['subscriptions:adopt'].response.parse(refusal)).toEqual(refusal);
  });

  test('the refusal vocabulary names the credential that went away', () => {
    expect(
      ipcErrorSchema.safeParse({ code: 'nothing-to-adopt', message: 'nothing stands there' })
        .success,
    ).toBe(true);
  });
});
