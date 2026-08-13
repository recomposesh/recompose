import type { AccountsDocument, SubscriptionAccount } from '@recompose/contracts';

import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';

import type { MachineReach } from './machine-store';

import { subscriptionHomes } from './subscription-homes';
import { subscriptionViews } from './subscription-views';

let userDataPath = '';
let machineHome = '';

const inAnHour = Date.now() + 60 * 60 * 1000;

function anAccount(over: Partial<SubscriptionAccount> = {}): SubscriptionAccount {
  return {
    id: 'acc-one',
    provider: 'anthropic',
    kind: 'subscription',
    label: 'ada@ex.com',
    provenance: 'machine',
    ...over,
  };
}

function documentOf(row: SubscriptionAccount): AccountsDocument {
  return { schemaVersion: ACCOUNTS_VERSION, accounts: [row] };
}

function reaching(): MachineReach {
  return { homeFolder: machineHome, platform: 'linux', custody: null, keyringHolds: null };
}

async function theMachineHolds(expiresAt: number): Promise<void> {
  await mkdir(join(machineHome, '.claude'), { recursive: true });
  await writeFile(
    join(machineHome, '.claude', '.credentials.json'),
    JSON.stringify({
      claudeAiOauth: { accessToken: 'opaque', subscriptionType: 'max', expiresAt },
    }),
    'utf8',
  );
  await writeFile(
    join(machineHome, '.claude.json'),
    JSON.stringify({ oauthAccount: { emailAddress: 'ada@ex.com' } }),
    'utf8',
  );
}

beforeEach(async () => {
  userDataPath = await mkdtemp(join(tmpdir(), 'recompose-views-'));
  machineHome = await mkdtemp(join(tmpdir(), 'recompose-views-machine-'));
});

describe('where a row reads its standing from', () => {
  function viewing(machine: MachineReach | null) {
    return {
      homes: subscriptionHomes(userDataPath, 'linux'),
      custody: null,
      machine,
    };
  }

  test('given an adopted account, the standing comes from the store its own tool wrote', async () => {
    await theMachineHolds(inAnHour);

    const [view] = await subscriptionViews(viewing(reaching()), documentOf(anAccount()));

    expect(view).toMatchObject({ standing: 'connected', signedInAs: 'ada@ex.com', plan: 'max' });
  });

  test('given an adopted account whose credential lapsed, the row reports the lapse', async () => {
    await theMachineHolds(1_000);

    const [view] = await subscriptionViews(viewing(reaching()), documentOf(anAccount()));

    expect(view).toMatchObject({ standing: 'lapsed' });
  });

  test('given an adopted account the machine no longer holds, the row reports the lapse', async () => {
    const [view] = await subscriptionViews(viewing(reaching()), documentOf(anAccount()));

    expect(view).toMatchObject({ standing: 'lapsed' });
  });

  test('given no way to reach the machine at all, an adopted row reports the lapse', async () => {
    await theMachineHolds(inAnHour);

    const [view] = await subscriptionViews(viewing(null), documentOf(anAccount()));

    expect(view).toMatchObject({ standing: 'lapsed' });
  });

  test('given an account the app signed in, the machine store is never what answers', async () => {
    await theMachineHolds(inAnHour);

    const [view] = await subscriptionViews(
      viewing(reaching()),
      documentOf(anAccount({ provenance: 'sign-in' })),
    );

    expect(view).toMatchObject({ standing: 'lapsed', provenance: 'sign-in' });
  });
});
