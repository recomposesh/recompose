import type { KeyCheckReport } from '@recompose/contracts';

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

describe('the vendors a check reaches beyond the first-party four', () => {
  test('a vendor reading a plain bearer token is checked at the address it is served on', async () => {
    const userDataPath = await tempStorage();
    const id = await connectKey(userDataPath, 'deepseek');
    const { handlers, scripted } = checkOver(userDataPath, () => ({
      verdict: 'authenticates',
      status: 200,
    }));

    await expect(handlers['accounts:check-key']({ id })).resolves.toEqual({
      ok: true,
      value: { verdict: 'authenticates', status: 200 },
    });

    expect(scripted.directives).toMatchObject([
      {
        kind: 'probe',
        origin: 'https://api.deepseek.com',
        custody: { custody: 'bearer', provider: 'deepseek', credential: secret },
      },
    ]);
  });

  test('an aggregator reaching many vendors through one key is checked at its own address', async () => {
    const userDataPath = await tempStorage();
    const id = await connectKey(userDataPath, 'openrouter', 'aggregator');
    const { handlers, scripted } = checkOver(userDataPath, () => ({
      verdict: 'authenticates',
      status: 200,
    }));

    await expect(handlers['accounts:check-key']({ id })).resolves.toEqual({
      ok: true,
      value: { verdict: 'authenticates', status: 200 },
    });

    expect(scripted.directives).toMatchObject([
      { kind: 'probe', origin: 'https://openrouter.ai/api', custody: { provider: 'openrouter' } },
    ]);
  });
});
