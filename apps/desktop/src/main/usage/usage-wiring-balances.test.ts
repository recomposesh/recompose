import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  aggregatorRow,
  aggregatorRowHoldingAReader,
  readerSecret,
  rewriteVault,
  secret,
} from '../engine-host/spend-grant.testkit';
import { openUsageIpcDeps } from './usage-wiring';
import {
  aUsageClock,
  creditsAnswer,
  fetchAnswering,
  NOW,
  reachInto,
  usageHome,
  wiringOver,
} from './usage-wiring.testkit';

aUsageClock();

const MANAGEMENT_KEY_WANTED =
  'OpenRouter reads credits only with a management key, and this account holds none. Add one on the account row and this card shows a balance.';

async function depsOverAReaderRow() {
  return openUsageIpcDeps(await wiringOver(await usageHome([aggregatorRowHoldingAReader])));
}

describe('the balance cards reaching OpenRouter', () => {
  test('a read answers the totals through the read-only key of the account', async () => {
    const asked = fetchAnswering(creditsAnswer({ data: { total_credits: 25, total_usage: 18.4 } }));

    const deps = await depsOverAReaderRow();

    expect(await deps.balances.read(false)).toEqual([
      { accountId: 'acc-many', reading: { remaining: 6.6, added: 25, spent: 18.4, readAt: NOW } },
    ]);
    expect(asked).toEqual([
      { endpoint: 'https://openrouter.ai/api/v1/credits', authorization: `Bearer ${readerSecret}` },
    ]);
  });

  test('the key the account serves requests with never reaches the credits endpoint', async () => {
    const asked = fetchAnswering(creditsAnswer({ data: { total_credits: 25, total_usage: 18.4 } }));

    const deps = await depsOverAReaderRow();

    await deps.balances.read(false);

    expect(asked.map((ask) => ask.authorization)).not.toContain(`Bearer ${secret}`);
  });

  test('an endpoint that refuses names the status on the card', async () => {
    fetchAnswering({ ok: false, status: 402 });

    const deps = await depsOverAReaderRow();

    expect(await deps.balances.read(false)).toEqual([
      { accountId: 'acc-many', failure: 'The credits endpoint answered 402.' },
    ]);
  });

  test('an answer holding no readable totals reads as a failure rather than zeros', async () => {
    fetchAnswering(creditsAnswer({ data: { credits: 25 } }));

    const deps = await depsOverAReaderRow();

    expect(await deps.balances.read(false)).toEqual([
      { accountId: 'acc-many', failure: 'The credits answer held no readable totals.' },
    ]);
  });

  test('a management key the endpoint still refuses names the wall it hit', async () => {
    fetchAnswering({ ok: false, status: 403 });

    const deps = await depsOverAReaderRow();

    expect(await deps.balances.read(false)).toEqual([
      { accountId: 'acc-many', failure: MANAGEMENT_KEY_WANTED },
    ]);
  });

  test('an account that purchased nothing shows no balance rather than a zero one', async () => {
    fetchAnswering(creditsAnswer({ data: { total_credits: 0, total_usage: 0 } }));

    const deps = await depsOverAReaderRow();

    expect(await deps.balances.read(false)).toEqual([
      {
        accountId: 'acc-many',
        failure:
          'OpenRouter reports no purchased credits on this account, so there is no balance to show.',
      },
    ]);
  });
});

describe('an account holding no read-only key', () => {
  test('the card says a management key is what it wants', async () => {
    fetchAnswering(creditsAnswer({ data: { total_credits: 25, total_usage: 18.4 } }));

    const deps = await openUsageIpcDeps(await wiringOver(await usageHome([aggregatorRow])));

    expect(await deps.balances.read(false)).toEqual([
      { accountId: 'acc-many', failure: MANAGEMENT_KEY_WANTED },
    ]);
  });

  test('nothing reaches the endpoint, because the stored key could only be refused', async () => {
    const asked = fetchAnswering(creditsAnswer({ data: { total_credits: 25, total_usage: 18.4 } }));

    const deps = await openUsageIpcDeps(await wiringOver(await usageHome([aggregatorRow])));

    await deps.balances.read(false);

    expect(asked).toEqual([]);
  });
});

describe('the vaulted key a balance read stands on', () => {
  test('a vault holding no secret for the account answers the failure card', async () => {
    const asked = fetchAnswering(creditsAnswer({}));
    const home = await usageHome([aggregatorRowHoldingAReader]);

    await rewriteVault(home, {});

    const deps = await openUsageIpcDeps(await wiringOver(home));

    expect(await deps.balances.read(false)).toEqual([
      { accountId: 'acc-many', failure: 'The vault holds no secret for this account.' },
    ]);
    expect(asked).toEqual([]);
  });

  test('a vault written by a newer recompose refuses in its own words', async () => {
    fetchAnswering(creditsAnswer({}));

    const home = await usageHome([aggregatorRowHoldingAReader]);

    await writeFile(join(home, 'vault.bin'), JSON.stringify({ schemaVersion: 2, entries: {} }));

    const deps = await openUsageIpcDeps(await wiringOver(home));

    expect(await deps.balances.read(false)).toEqual([
      { accountId: 'acc-many', failure: 'vault schemaVersion 2 is newer than supported 1' },
    ]);
  });
});

describe('a registry that moves under a read', () => {
  test('an account that leaves before its secret is read answers a failure card', async () => {
    fetchAnswering(creditsAnswer({}));

    const stocked = await usageHome([aggregatorRow]);
    const emptied = await usageHome([]);
    let registry = stocked;
    let leavesOnTheNextAsk = false;
    const reach = () => {
      const home = registry;

      if (leavesOnTheNextAsk) {
        registry = emptied;
      }

      return reachInto(home);
    };
    const deps = await openUsageIpcDeps(await wiringOver(stocked, { reach }));

    leavesOnTheNextAsk = true;

    expect(await deps.balances.read(false)).toEqual([
      {
        accountId: 'acc-many',
        failure: 'no account that reports a balance is held under acc-many.',
      },
    ]);
  });
});
