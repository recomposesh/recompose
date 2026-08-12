import type { LogRow, QuotaWindow, UsageBucket } from '@recompose/contracts';

const FIVE_HOURS_MS = 5 * 3_600_000;

const A_WEEK_MS = 7 * 24 * 3_600_000;

type Burn = { at: number; tokens: number };

type FoldedWindow = { openedAt: number; closesAt: number; burnTokens: number };

type SubscriptionAccount = { accountId: string; provider: string };

function subscriptionAccountsIn(buckets: readonly UsageBucket[]): readonly SubscriptionAccount[] {
  const named = new Map<string, SubscriptionAccount>();

  for (const bucket of buckets) {
    const { accountId, accountKind, provider } = bucket.tuple;

    if (accountKind === 'subscription' && accountId !== undefined && provider !== undefined) {
      named.set(accountId, { accountId, provider });
    }
  }

  return [...named.values()];
}

function burnsOf(
  accountId: string,
  buckets: readonly UsageBucket[],
  liveRows: readonly LogRow[],
): readonly Burn[] {
  const folded = buckets.flatMap((bucket) =>
    bucket.tuple.accountId === accountId
      ? [{ at: bucket.start, tokens: bucket.measures.tokens.total }]
      : [],
  );
  const live = liveRows.flatMap((row) =>
    row.accountId === accountId ? [{ at: row.at, tokens: row.tokens ?? 0 }] : [],
  );

  return [...folded, ...live].toSorted((earlier, later) => earlier.at - later.at);
}

/**
 * The windows one account's burns fold into, in time order.
 *
 * @summary A window opens at the first activity at or after the previous window's close and
 * closes a fixed length later, which is how the subscription vendors anchor theirs: on the first
 * request after idleness, never on the clock face.
 */
function foldedWindows(burns: readonly Burn[], lengthMs: number): readonly FoldedWindow[] {
  return burns.reduce<readonly FoldedWindow[]>((windows, burn) => {
    const open = windows.at(-1);

    if (open === undefined || burn.at >= open.closesAt) {
      return [
        ...windows,
        { openedAt: burn.at, closesAt: burn.at + lengthMs, burnTokens: burn.tokens },
      ];
    }

    return windows.map((held) =>
      held === open ? { ...held, burnTokens: held.burnTokens + burn.tokens } : held,
    );
  }, []);
}

function recordOf(windows: readonly FoldedWindow[]): QuotaWindow['record'] {
  const biggest = windows.reduce<FoldedWindow | undefined>(
    (held, window) => (held === undefined || window.burnTokens > held.burnTokens ? window : held),
    undefined,
  );

  return biggest === undefined
    ? undefined
    : { burnTokens: biggest.burnTokens, openedAt: biggest.openedAt };
}

function countdownOf(
  open: FoldedWindow | undefined,
  length: QuotaWindow['length'],
): Pick<QuotaWindow, 'openedAt' | 'closesAt'> {
  if (open === undefined || length === 'week') {
    return {};
  }

  return { openedAt: open.openedAt, closesAt: open.closesAt };
}

function windowRowOf(
  account: SubscriptionAccount,
  length: QuotaWindow['length'],
  windows: readonly FoldedWindow[],
  now: number,
): QuotaWindow {
  const open = windows.findLast((held) => held.closesAt > now);
  const record = recordOf(windows);

  return {
    accountId: account.accountId,
    provider: account.provider,
    length,
    burnTokens: open?.burnTokens ?? 0,
    ...countdownOf(open, length),
    ...(record === undefined ? {} : { record }),
  };
}

/**
 * The window burns every subscription account carries, derived from local logs alone.
 *
 * @summary No first-party quota endpoint exists, so nothing here claims official remaining quota:
 * the fold reads what this machine sent, the record is the account's own busiest window inside
 * retention, and the weekly row never claims a close because no honest weekly boundary exists.
 * Rows the ledger has not folded yet ride in beside the buckets, so the open hour still burns.
 */
export function quotaWindowsOf(
  buckets: readonly UsageBucket[],
  liveRows: readonly LogRow[],
  now: number,
): readonly QuotaWindow[] {
  return subscriptionAccountsIn(buckets).flatMap((account) => {
    const burns = burnsOf(account.accountId, buckets, liveRows);

    return [
      windowRowOf(account, '5h', foldedWindows(burns, FIVE_HOURS_MS), now),
      windowRowOf(account, 'week', foldedWindows(burns, A_WEEK_MS), now),
    ];
  });
}
