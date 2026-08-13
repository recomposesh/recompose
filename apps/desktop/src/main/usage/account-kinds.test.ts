import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { openAccountKinds } from './account-kinds';

async function anAccountsFile(): Promise<string> {
  const file = join(await mkdtemp(join(tmpdir(), 'recompose-accounts-')), 'accounts.json');

  await writeFile(
    file,
    JSON.stringify({
      schemaVersion: ACCOUNTS_VERSION,
      accounts: [
        {
          id: 'sub-1',
          provider: 'anthropic',
          kind: 'subscription',
          label: 'Personal',
          provenance: 'sign-in',
        },
        {
          id: 'key-1',
          provider: 'anthropic',
          kind: 'api-key',
          label: 'Work',
          credentialRef: 'vault:key-1',
        },
      ],
    }),
  );

  return file;
}

describe('resolving the kind an account holds today', () => {
  test('a stored account answers its kind', async () => {
    const kinds = await openAccountKinds({
      file: await anAccountsFile(),
      onCorrupt: () => undefined,
    });

    expect(kinds.kindOf('sub-1')).toBe('subscription');
    expect(kinds.kindOf('key-1')).toBe('api-key');
  });

  test('an account nobody stored answers nothing, the way a gateway-raised row reads', async () => {
    const kinds = await openAccountKinds({
      file: await anAccountsFile(),
      onCorrupt: () => undefined,
    });

    expect(kinds.kindOf('departed')).toBeUndefined();
    expect(kinds.kindOf(undefined)).toBeUndefined();
  });

  test('a refresh reads the file again, so a connected account resolves without a restart', async () => {
    const file = await anAccountsFile();
    const kinds = await openAccountKinds({ file, onCorrupt: () => undefined });

    await writeFile(
      file,
      JSON.stringify({
        schemaVersion: ACCOUNTS_VERSION,
        accounts: [
          {
            id: 'router-1',
            provider: 'openrouter',
            kind: 'aggregator',
            label: 'Router',
            credentialRef: 'vault:router-1',
          },
        ],
      }),
    );
    await kinds.refresh();

    expect(kinds.kindOf('router-1')).toBe('aggregator');
    expect(kinds.kindOf('sub-1')).toBeUndefined();
  });
});
