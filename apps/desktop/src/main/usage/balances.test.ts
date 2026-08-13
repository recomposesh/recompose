import type { AccountsDocument } from '@recompose/contracts';

import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { creditsFromAnswer, openBalancesDesk, openRouterAccountsIn } from './balances';

const NOW = 1_754_600_400_000;

type Scripted = {
  answers: Map<string, () => Promise<{ totalCredits: number; totalUsage: number }>>;
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

const generous = async () => Promise.resolve({ totalCredits: 25, totalUsage: 18.4 });

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
      { accountId: 'router-1', reading: { totalCredits: 25, totalUsage: 18.4, readAt: NOW } },
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
        reading: { totalCredits: 25, totalUsage: 18.4, readAt: NOW },
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

    expect(openRouterAccountsIn(document)).toEqual([{ accountId: 'router-1' }]);
  });
});

describe('reading the upstream answer', () => {
  test('the OpenRouter shape yields its two totals', () => {
    expect(creditsFromAnswer({ data: { total_credits: 25, total_usage: 18.4 } })).toEqual({
      totalCredits: 25,
      totalUsage: 18.4,
    });
  });

  test('a moved shape answers nothing rather than zeros', () => {
    expect(creditsFromAnswer({ data: { credits: 25 } })).toBeUndefined();
    expect(creditsFromAnswer('not even close')).toBeUndefined();
  });
});
