import type { AccountsDocument } from '@recompose/contracts';

import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { CreditsReading } from './balances';

import {
  creditsFromAnswer,
  creditsRefusalForStatus,
  openBalancesDesk,
  balanceReadableAccountsIn,
} from './balances';

const NOW = 1_754_600_400_000;

type Scripted = {
  answers: Map<string, () => Promise<CreditsReading>>;
};

function aDeskOver(scripted: Scripted) {
  return openBalancesDesk({
    aggregatorAccounts: async () =>
      Promise.resolve([...scripted.answers.keys()].map((accountId) => ({ accountId }))),
    creditsOf: async (accountId) => {
      const answer = scripted.answers.get(accountId);

      if (answer === undefined) {
        throw new Error('no such account');
      }

      return answer();
    },
  });
}

const generous = async () => Promise.resolve({ remaining: 6.6, added: 25, spent: 18.4 });

const refused = async (): Promise<never> =>
  Promise.reject(new Error('The credential was refused.'));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('reading the aggregator balances', () => {
  test('a machine without an aggregator answers no cards', async () => {
    const desk = aDeskOver({ answers: new Map() });

    expect(await desk.read(false)).toEqual([]);
  });

  test('a read answers the credits beside the instant they were taken', async () => {
    const desk = aDeskOver({ answers: new Map([['router-1', generous]]) });

    expect(await desk.read(false)).toEqual([
      { accountId: 'router-1', reading: { remaining: 6.6, added: 25, spent: 18.4, readAt: NOW } },
    ]);
  });

  test('a fresh-enough reading answers again rather than asking the upstream twice', async () => {
    const desk = aDeskOver({ answers: new Map([['router-1', generous]]) });

    await desk.read(false);
    vi.setSystemTime(NOW + 30_000);

    expect((await desk.read(false)).at(0)?.reading?.readAt).toBe(NOW);
  });

  test('a reading past its minute is taken again', async () => {
    const desk = aDeskOver({ answers: new Map([['router-1', generous]]) });

    await desk.read(false);
    vi.setSystemTime(NOW + 90_000);

    expect((await desk.read(false)).at(0)?.reading?.readAt).toBe(NOW + 90_000);
  });

  test('asking for a refresh takes a fresh reading whatever the cache holds', async () => {
    const desk = aDeskOver({ answers: new Map([['router-1', generous]]) });

    await desk.read(false);
    vi.setSystemTime(NOW + 5_000);

    expect((await desk.read(true)).at(0)?.reading?.readAt).toBe(NOW + 5_000);
  });

  test('a failed first read carries the failure and no reading it never took', async () => {
    const desk = aDeskOver({ answers: new Map([['router-1', refused]]) });

    expect(await desk.read(false)).toEqual([
      { accountId: 'router-1', failure: 'The credential was refused.' },
    ]);
  });

  test('a failed refresh keeps the last good reading beside the failure', async () => {
    const scripted: Scripted = { answers: new Map([['router-1', generous]]) };
    const desk = aDeskOver(scripted);

    await desk.read(false);
    scripted.answers.set('router-1', refused);
    vi.setSystemTime(NOW + 90_000);

    expect(await desk.read(false)).toEqual([
      {
        accountId: 'router-1',
        reading: { remaining: 6.6, added: 25, spent: 18.4, readAt: NOW },
        failure: 'The credential was refused.',
      },
    ]);
  });
});

describe('the accounts whose balance a card can hold', () => {
  test('only OpenRouter aggregators earn a card, because only that endpoint exists', () => {
    const document: AccountsDocument = {
      schemaVersion: ACCOUNTS_VERSION,
      accounts: [
        {
          id: 'router-1',
          provider: 'openrouter',
          kind: 'aggregator',
          label: 'Router',
          credentialRef: 'vault:router-1',
        },
        {
          id: 'other-agg',
          provider: 'other-router',
          kind: 'aggregator',
          label: 'Other',
          credentialRef: 'vault:other-agg',
        },
        {
          id: 'sub-1',
          provider: 'anthropic',
          kind: 'subscription',
          provenance: 'sign-in',
          label: 'Personal',
        },
      ],
    };

    expect(balanceReadableAccountsIn(document)).toEqual([{ accountId: 'router-1' }]);
  });
});

const UNREADABLE = 'The credits answer held no readable totals.';

const NOTHING_PURCHASED =
  'OpenRouter reports no purchased credits on this account, so there is no balance to show.';

describe('reading the upstream answer', () => {
  test('the OpenRouter shape yields its two totals', () => {
    expect(creditsFromAnswer({ data: { total_credits: 25, total_usage: 18.4 } })).toEqual({
      read: { remaining: 6.6, added: 25, spent: 18.4 },
    });
  });

  test('a moved shape refuses rather than reading zeros', () => {
    expect(creditsFromAnswer({ data: { credits: 25 } })).toEqual({ refusal: UNREADABLE });
    expect(creditsFromAnswer('not even close')).toEqual({ refusal: UNREADABLE });
  });

  test('a total that is not a finite amount refuses rather than printing itself', () => {
    expect(creditsFromAnswer({ data: { total_credits: Number.NaN, total_usage: 4 } })).toEqual({
      refusal: UNREADABLE,
    });
    expect(
      creditsFromAnswer({ data: { total_credits: Number.POSITIVE_INFINITY, total_usage: 4 } }),
    ).toEqual({ refusal: UNREADABLE });
  });

  test('a total below zero refuses, because the card can hold no such reading', () => {
    expect(creditsFromAnswer({ data: { total_credits: 25, total_usage: -1 } })).toEqual({
      refusal: UNREADABLE,
    });
  });

  test('an account that purchased nothing states no balance rather than a zero one', () => {
    expect(creditsFromAnswer({ data: { total_credits: 0, total_usage: 0 } })).toEqual({
      refusal: NOTHING_PURCHASED,
    });
  });

  test('spending against nothing purchased still states no balance, never a debt', () => {
    expect(creditsFromAnswer({ data: { total_credits: 0, total_usage: 0.0034 } })).toEqual({
      refusal: NOTHING_PURCHASED,
    });
  });
});

describe('what a refused credits read says', () => {
  test('a management-key wall names the key the endpoint wants and where to add one', () => {
    expect(creditsRefusalForStatus(403)).toBe(
      'OpenRouter reads credits only with a management key, and this account holds none. Add one on the account row and this card shows a balance.',
    );
  });

  test('an unrecognized key blames the key rather than the endpoint', () => {
    expect(creditsRefusalForStatus(401)).toBe(
      'OpenRouter did not recognize the key saved for this account.',
    );
  });

  test('any other status names itself, because the app can say nothing more', () => {
    expect(creditsRefusalForStatus(500)).toBe('The credits endpoint answered 500.');
  });
});

test('a desk opened over kept readings answers them without asking upstream again', async () => {
  const restored = { remaining: 6.6, added: 25, spent: 18.4, readAt: Date.now() };
  const asked: string[] = [];
  const desk = openBalancesDesk({
    aggregatorAccounts: async () => Promise.resolve([{ accountId: 'router-1' }]),
    creditsOf: async (accountId) => {
      asked.push(accountId);

      return Promise.resolve({ remaining: 8.0, added: 9, spent: 1 });
    },
    kept: [{ accountId: 'router-1', reading: restored }],
  });

  expect(await desk.read(false)).toEqual([{ accountId: 'router-1', reading: restored }]);
  expect(asked).toEqual([]);
});

test('a reading the desk takes is handed to whoever keeps it, so a restart finds it again', async () => {
  const kept: { accountId: string; readAt: number }[] = [];
  const desk = openBalancesDesk({
    aggregatorAccounts: async () => Promise.resolve([{ accountId: 'router-1' }]),
    creditsOf: async () => Promise.resolve({ remaining: 8.0, added: 9, spent: 1 }),
    onKept: (accountId, reading) => {
      kept.push({ accountId, readAt: reading.readAt });
    },
  });

  await desk.read(true);

  expect(kept.map((held) => held.accountId)).toEqual(['router-1']);
});

describe('the accounts a balance card can stand for', () => {
  const registry: AccountsDocument = {
    schemaVersion: ACCOUNTS_VERSION,
    accounts: [
      { id: 'r1', kind: 'aggregator', provider: 'openrouter', label: 'r', credentialRef: 'c1' },
      { id: 'd1', kind: 'api-key', provider: 'deepseek', label: 'd', credentialRef: 'c2' },
      { id: 'k1', kind: 'api-key', provider: 'moonshot', label: 'k', credentialRef: 'c3' },
      { id: 'g1', kind: 'api-key', provider: 'groq', label: 'g', credentialRef: 'c4' },
      { id: 's1', kind: 'subscription', provider: 'anthropic', label: 's', provenance: 'sign-in' },
    ],
  };

  test('every provider that publishes a balance endpoint carries a card', () => {
    expect(balanceReadableAccountsIn(registry).map((held) => held.accountId)).toEqual([
      'r1',
      'd1',
      'k1',
    ]);
  });

  test('a provider that publishes none carries no card rather than an empty one', () => {
    expect(balanceReadableAccountsIn(registry).map((held) => held.accountId)).not.toContain('g1');
  });

  test('a plan carries none either, because a plan reports a share rather than a wallet', () => {
    expect(balanceReadableAccountsIn(registry).map((held) => held.accountId)).not.toContain('s1');
  });
});
