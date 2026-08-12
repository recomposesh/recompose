import type { AccountBalance, AccountsDocument, BalanceReading } from '@recompose/contracts';

import { isRecord } from '../storage/json-file';

/** The accounts whose balance a card can hold: OpenRouter is the one credits endpoint that exists. */
export function openRouterAccountsIn(document: AccountsDocument): readonly { accountId: string }[] {
  return document.accounts.flatMap((account) =>
    account.kind === 'aggregator' && account.provider === 'openrouter'
      ? [{ accountId: account.id }]
      : [],
  );
}

const FRESH_ENOUGH_MS = 60_000;

export type CreditsReading = { totalCredits: number; totalUsage: number };

export type BalancesDeps = {
  aggregatorAccounts: () => Promise<readonly { accountId: string }[]>;
  creditsOf: (accountId: string) => Promise<CreditsReading>;
};

export type BalancesDesk = {
  read: (refresh: boolean) => Promise<readonly AccountBalance[]>;
};

/**
 * The two totals an OpenRouter credits answer carries, and nothing when the shape moved.
 *
 * @summary The upstream documents `data.total_credits` and `data.total_usage`. A payload missing
 * either answers nothing rather than zeros, so a moved shape reads as a failure instead of an
 * empty wallet.
 */
export function creditsFromAnswer(payload: unknown): CreditsReading | undefined {
  if (!isRecord(payload) || !isRecord(payload['data'])) {
    return undefined;
  }

  const totalCredits = payload['data']['total_credits'];
  const totalUsage = payload['data']['total_usage'];

  if (typeof totalCredits !== 'number' || typeof totalUsage !== 'number') {
    return undefined;
  }

  return { totalCredits, totalUsage };
}

function failureSentenceOf(failure: unknown): string {
  return failure instanceof Error ? failure.message : 'The balance read failed.';
}

/**
 * The aggregator balance cards, cached for the minute the upstream itself caches.
 *
 * @summary OpenRouter documents its credits answer as up to a minute stale, so asking more often
 * buys nothing. A fresh-enough reading answers again with its original stamp, a refresh ask takes
 * a new one regardless, and a failed read keeps the last good reading beside the failure sentence
 * so a stale number never poses as a fresh one and a card never goes blank over a blip.
 */
export function openBalancesDesk(deps: BalancesDeps): BalancesDesk {
  const held = new Map<string, BalanceReading>();

  const freshEnough = (standing: BalanceReading | undefined): standing is BalanceReading =>
    standing !== undefined && Date.now() - standing.readAt < FRESH_ENOUGH_MS;

  const cardOf = async (accountId: string, refresh: boolean): Promise<AccountBalance> => {
    const standing = held.get(accountId);

    if (!refresh && freshEnough(standing)) {
      return { accountId, reading: standing };
    }

    try {
      const credits = await deps.creditsOf(accountId);
      const reading: BalanceReading = { ...credits, readAt: Date.now() };

      held.set(accountId, reading);

      return { accountId, reading };
    } catch (failure) {
      return {
        accountId,
        ...(standing === undefined ? {} : { reading: standing }),
        failure: failureSentenceOf(failure),
      };
    }
  };

  return {
    read: async (refresh) => {
      const accounts = await deps.aggregatorAccounts();

      return Promise.all(accounts.map(async ({ accountId }) => cardOf(accountId, refresh)));
    },
  };
}
