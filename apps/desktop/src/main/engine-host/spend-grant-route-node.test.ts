import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { resolveSpendGrant } from './spend-grant';
import {
  aggregatorRow,
  contextFor,
  keyRow,
  ladderedOver,
  secret,
  storageHolding,
} from './spend-grant.testkit';

const overTwoAccounts = ladderedOver([
  { node: 'first', accountId: keyRow.id },
  { node: 'second', accountId: aggregatorRow.id, providerModel: 'gpt-5' },
]);

async function grantFor(userDataPath: string, routeNode: string) {
  return resolveSpendGrant(contextFor(userDataPath), 'personal', 'fast', routeNode);
}

describe('which node a spend request draws custody for', () => {
  test('the grant resolves the account the named node holds', async () => {
    const userDataPath = await storageHolding([overTwoAccounts], [keyRow, aggregatorRow]);

    await expect(grantFor(userDataPath, 'first')).resolves.toStrictEqual({
      verdict: 'resolved',
      providerOrigin: 'https://api.anthropic.com',
      spend: {
        custody: 'credentialed',
        provider: 'anthropic',
        credential: secret,
        accountId: keyRow.id,
      },
    });
  });

  test('the second node draws its own account rather than the one the first node holds', async () => {
    const userDataPath = await storageHolding([overTwoAccounts], [keyRow, aggregatorRow]);

    await expect(grantFor(userDataPath, 'second')).resolves.toStrictEqual({
      verdict: 'resolved',
      providerOrigin: 'https://openrouter.ai/api',
      spend: {
        custody: 'credentialed',
        provider: 'openrouter',
        credential: secret,
        accountId: aggregatorRow.id,
      },
    });
  });
});

describe('a route node the stored table does not hold', () => {
  test('a node name the table never held answers a missing target', async () => {
    const userDataPath = await storageHolding([overTwoAccounts], [keyRow, aggregatorRow]);

    await expect(grantFor(userDataPath, 'third')).resolves.toStrictEqual({
      verdict: 'missing-target',
    });
  });

  test('a node the table never held is refused rather than guessed at another node', async () => {
    const userDataPath = await storageHolding([overTwoAccounts], [keyRow, aggregatorRow]);
    const refused = await grantFor(userDataPath, 'third');

    expect(JSON.stringify(refused)).not.toContain(secret);
  });

  test('a router node answers a missing target, because a ladder names no one account', async () => {
    const userDataPath = await storageHolding([overTwoAccounts], [keyRow, aggregatorRow]);

    await expect(grantFor(userDataPath, 'ladder')).resolves.toStrictEqual({
      verdict: 'missing-target',
    });
  });

  test('a router node is refused off the table alone, so an unreadable registry never enters it', async () => {
    const userDataPath = await storageHolding([overTwoAccounts], [keyRow, aggregatorRow]);

    await rm(join(userDataPath, 'accounts.json'));
    await mkdir(join(userDataPath, 'accounts.json'));

    await expect(grantFor(userDataPath, 'ladder')).resolves.toStrictEqual({
      verdict: 'missing-target',
    });
  });

  test('a node whose account left the registry answers a missing target', async () => {
    const userDataPath = await storageHolding([overTwoAccounts], [aggregatorRow]);

    await expect(grantFor(userDataPath, 'first')).resolves.toStrictEqual({
      verdict: 'missing-target',
    });
  });
});

describe('a missing credential on one node, which is the shape of CLIProxyAPI#3317', () => {
  const onlyTheSiblingHasACredential = { 'cred-many': secret };

  test('a missing credential on one node stays a per-node answer', async () => {
    const userDataPath = await storageHolding(
      [overTwoAccounts],
      [keyRow, aggregatorRow],
      onlyTheSiblingHasACredential,
    );

    await expect(grantFor(userDataPath, 'first')).resolves.toStrictEqual({
      verdict: 'missing-credential',
    });
  });

  test('nothing about it may mark a sibling unavailable', async () => {
    const userDataPath = await storageHolding(
      [overTwoAccounts],
      [keyRow, aggregatorRow],
      onlyTheSiblingHasACredential,
    );

    await grantFor(userDataPath, 'first');

    await expect(grantFor(userDataPath, 'second')).resolves.toMatchObject({
      verdict: 'resolved',
      spend: { credential: secret },
    });
  });

  test('the sibling grants the same whether or not the refused node was asked first', async () => {
    const userDataPath = await storageHolding(
      [overTwoAccounts],
      [keyRow, aggregatorRow],
      onlyTheSiblingHasACredential,
    );

    const asked = await grantFor(userDataPath, 'second');

    await grantFor(userDataPath, 'first');

    await expect(grantFor(userDataPath, 'second')).resolves.toStrictEqual(asked);
  });
});
