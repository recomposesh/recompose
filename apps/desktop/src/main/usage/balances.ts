import type { AccountBalance, AccountsDocument, BalanceReading } from '@recompose/contracts';

import { isRecord } from '../storage/json-file';

/**
 * Every provider that publishes a balance a stored credential can read.
 *
 * @summary A vendor stands here only where its own documentation names an endpoint, so the set
 * grows by adding a row rather than by another branch. A vendor documenting none reports no wallet
 * at all, and a subscription reports a share of a plan rather than money, so neither belongs.
 */
const BALANCE_READABLE = ['openrouter', 'deepseek', 'moonshot'] as const;

export function balanceReadableAccountsIn(
  document: AccountsDocument,
): readonly { accountId: string }[] {
  return document.accounts.flatMap((account) =>
    account.kind !== 'subscription' &&
    account.kind !== 'local' &&
    BALANCE_READABLE.some((named) => named === account.provider)
      ? [{ accountId: account.id }]
      : [],
  );
}

const FRESH_ENOUGH_MS = 60_000;

/**
 * What one vendor's balance answer states, on the one shape every card reads.
 *
 * @summary What is left is the only figure every vendor reports. A vendor naming what was bought
 * and what went sends both beside it, and one naming a balance alone sends neither, because a zero
 * there would say a wallet was never topped up rather than that nobody said.
 */
export type CreditsReading = {
  remaining: number;
  added?: number;
  spent?: number;
  currency?: string;
};

export type BalancesDeps = {
  aggregatorAccounts: () => Promise<readonly { accountId: string }[]>;
  creditsOf: (accountId: string) => Promise<CreditsReading>;
  /** What a restart restored, so a launch answers from disk before it asks anybody. */
  kept?: readonly { accountId: string; reading: BalanceReading }[] | undefined;
  /** Where a fresh reading goes to outlive the process. */
  onKept?: ((accountId: string, reading: BalanceReading) => void) | undefined;
};

export type BalancesDesk = {
  read: (refresh: boolean) => Promise<readonly AccountBalance[]>;
};

export type CreditsAnswer = { read: CreditsReading } | { refusal: string };

const UNREADABLE_TOTALS = 'The credits answer held no readable totals.';

const NOTHING_PURCHASED =
  'OpenRouter reports no purchased credits on this account, so there is no balance to show.';

/**
 * What a card says when no management key stands behind it, whether it asked or never could.
 *
 * @summary One sentence covers both, because a person reads the same wall either way and the fix
 * is the same act. It names the row rather than the Usage page, since the key is added where the
 * account is managed and this card is only where its absence shows.
 */
export const MANAGEMENT_KEY_WANTED =
  'OpenRouter reads credits only with a management key, and this account holds none. Add one on the account row and this card shows a balance.';

const KEY_UNRECOGNIZED = 'OpenRouter did not recognize the key saved for this account.';

const UNAUTHORIZED = 401;

const FORBIDDEN = 403;

const CENTS_IN_A_DOLLAR = 100;

/**
 * A balance a vendor left this reader to subtract, rounded before anybody stores it.
 *
 * @summary Two floats that all but cancel leave a hair either side of zero, and a hair below it is
 * a debt on a wallet that owes nothing. Rounding where the subtraction happens is what stops that
 * hair reaching the disk, where every later reader would have to round it again.
 */
function toCents(amount: number): number {
  return Math.round(amount * CENTS_IN_A_DOLLAR) / CENTS_IN_A_DOLLAR;
}

function isAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function totalsIn(payload: unknown): CreditsReading | undefined {
  if (!isRecord(payload) || !isRecord(payload['data'])) {
    return undefined;
  }

  const totalCredits = payload['data']['total_credits'];
  const totalUsage = payload['data']['total_usage'];

  if (!isAmount(totalCredits) || !isAmount(totalUsage)) {
    return undefined;
  }

  return {
    remaining: toCents(totalCredits - totalUsage),
    added: totalCredits,
    spent: totalUsage,
  };
}

/**
 * The balance an OpenRouter credits answer states, or the sentence saying why it states none.
 *
 * @summary The upstream documents `data.total_credits` as credits purchased and `data.total_usage`
 * as credits used, both required doubles. Two readings are refused rather than printed: a payload
 * whose totals are not finite amounts at or above zero, which `balanceReadingSchema` could not hold
 * anyway, and an account that purchased nothing, because subtracting usage from nothing states a
 * balance the account never had. A wallet the endpoint never described must not reach a card as a
 * zero, since a zero reads as an emptied wallet rather than as an absent one.
 */
export function creditsFromAnswer(payload: unknown): CreditsAnswer {
  const totals = totalsIn(payload);

  if (totals === undefined) {
    return { refusal: UNREADABLE_TOTALS };
  }

  return totals.added === 0 ? { refusal: NOTHING_PURCHASED } : { read: totals };
}

/**
 * What a card says when the credits endpoint refuses the read.
 *
 * @summary OpenRouter documents `GET /api/v1/credits` as management-key only, answering 403 with
 * "Only management keys can perform this operation" to an inference key. A management key cannot
 * serve inference, so it is held beside the stored key rather than in place of it, and a 403 means
 * the key this account reads with is not a management key either.
 */
export function creditsRefusalForStatus(status: number): string {
  if (status === FORBIDDEN) {
    return MANAGEMENT_KEY_WANTED;
  }

  return status === UNAUTHORIZED
    ? KEY_UNRECOGNIZED
    : `The credits endpoint answered ${String(status)}.`;
}

function failureSentenceOf(failure: unknown): string {
  return failure instanceof Error ? failure.message : 'The balance read failed.';
}

/**
 * The aggregator balance cards, cached for a minute at a time.
 *
 * @summary The minute is recompose's own restraint, not an upstream promise: OpenRouter documents
 * no staleness bound for its credits answer, so nothing here may be justified by one. A
 * fresh-enough reading answers again with its original stamp, a refresh ask takes a new one
 * regardless, and a failed read keeps the last good reading beside the failure sentence so a stale
 * number never poses as a fresh one and a card never goes blank over a blip.
 */
export function openBalancesDesk(deps: BalancesDeps): BalancesDesk {
  const held = new Map<string, BalanceReading>(
    (deps.kept ?? []).map((standing) => [standing.accountId, standing.reading]),
  );

  const freshEnough = (standing: BalanceReading | undefined): standing is BalanceReading =>
    standing !== undefined && Date.now() - standing.readAt < FRESH_ENOUGH_MS;

  const takenFor = async (accountId: string): Promise<BalanceReading> => {
    const reading: BalanceReading = { ...(await deps.creditsOf(accountId)), readAt: Date.now() };

    held.set(accountId, reading);
    deps.onKept?.(accountId, reading);

    return reading;
  };

  const cardOf = async (accountId: string, refresh: boolean): Promise<AccountBalance> => {
    const standing = held.get(accountId);

    if (!refresh && freshEnough(standing)) {
      return { accountId, reading: standing };
    }

    try {
      return { accountId, reading: await takenFor(accountId) };
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

const MOVED_SHAPE = 'The balance answer held nothing this build can read.';

const DEEPSEEK_UNAVAILABLE =
  'DeepSeek reports this account as unavailable, so it states no balance.';

function amountFrom(value: unknown): number | undefined {
  const read = typeof value === 'string' ? Number(value) : value;

  return isAmount(read) ? read : undefined;
}

/**
 * The balance DeepSeek states, taken from the one entry a card can honestly print.
 *
 * @summary The vendor answers an array with a currency on each entry, and amounts as strings. Two
 * entries in two currencies are two wallets rather than one sum, so the card reads the first and
 * prints its own sign rather than adding figures that do not add.
 */
function firstEntryIn(payload: unknown): Record<string, unknown> | undefined {
  const infos: unknown = isRecord(payload) ? payload['balance_infos'] : undefined;

  if (!Array.isArray(infos)) {
    return undefined;
  }

  const first: unknown = infos[0];

  return isRecord(first) ? first : undefined;
}

function walletIn(entry: Record<string, unknown> | undefined): CreditsReading | undefined {
  if (entry === undefined) {
    return undefined;
  }

  const remaining = amountFrom(entry['total_balance']);
  const currency = entry['currency'];

  return remaining === undefined || typeof currency !== 'string'
    ? undefined
    : { remaining, currency };
}

function deepseekBalance(payload: unknown): CreditsAnswer {
  if (isRecord(payload) && payload['is_available'] === false) {
    return { refusal: DEEPSEEK_UNAVAILABLE };
  }

  const wallet = walletIn(firstEntryIn(payload));

  return wallet === undefined ? { refusal: MOVED_SHAPE } : { read: wallet };
}

/** The balance Moonshot states, which its docs count in one currency per host. */
function moonshotBalance(payload: unknown): CreditsAnswer {
  const data = isRecord(payload) ? payload['data'] : undefined;
  const remaining = isRecord(data) ? amountFrom(data['available_balance']) : undefined;

  return remaining === undefined ? { refusal: MOVED_SHAPE } : { read: { remaining } };
}

const BALANCE_SHAPES = {
  openrouter: creditsFromAnswer,
  deepseek: deepseekBalance,
  moonshot: moonshotBalance,
} as const satisfies Record<(typeof BALANCE_READABLE)[number], (payload: unknown) => CreditsAnswer>;

/**
 * What one vendor's balance answer states, read by the shape that vendor documents.
 *
 * @summary The shapes sit in a table rather than in a chain, so a vendor is added by writing down
 * what it answers rather than by another branch. A vendor this build knows no shape for refuses,
 * because guessing at a wallet is how a card comes to print a figure nobody sent.
 */
export function balanceFromAnswer(provider: string, payload: unknown): CreditsAnswer {
  const reading = Object.entries(BALANCE_SHAPES).find(([named]) => named === provider)?.[1];

  return reading === undefined ? { refusal: MOVED_SHAPE } : reading(payload);
}
