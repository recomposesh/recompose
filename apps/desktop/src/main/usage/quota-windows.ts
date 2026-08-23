import type {
  LogRow,
  PlanUsageReading,
  PlanUsageReadings,
  QuotaWindow,
  UsageBucket,
} from '@recompose/contracts';

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

/**
 * @summary The window still open is never its own record. A meter measures today against what the
 * account has already lived through, so a machine whose whole history is one open window has nothing
 * to measure against and says so, rather than drawing every meter full at its own burn.
 */
function recordOf(closed: readonly FoldedWindow[]): QuotaWindow['record'] {
  const biggest = closed.reduce<FoldedWindow | undefined>(
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

function reportedOf(
  reading: PlanUsageReading | undefined,
  length: QuotaWindow['length'],
): Pick<QuotaWindow, 'reported'> {
  if (reading === undefined) {
    return {};
  }

  const window = reading.windows.find((held) => held.length === length);

  if (window === undefined) {
    return {};
  }

  return {
    reported: {
      spentShare: window.spentShare,
      readAt: reading.readAt,
      ...(window.resetsAt === undefined ? {} : { resetsAt: window.resetsAt }),
    },
  };
}

type AccountStanding = SubscriptionAccount & {
  now: number;
  reading: PlanUsageReading | undefined;
};

function windowRowOf(
  standing: AccountStanding,
  length: QuotaWindow['length'],
  windows: readonly FoldedWindow[],
): QuotaWindow {
  const open = windows.findLast((held) => held.closesAt > standing.now);
  const record = recordOf(windows.filter((held) => held !== open));

  return {
    accountId: standing.accountId,
    provider: standing.provider,
    length,
    burnTokens: open?.burnTokens ?? 0,
    ...countdownOf(open, length),
    ...(record === undefined ? {} : { record }),
    ...reportedOf(standing.reading, length),
  };
}

/**
 * The window burns every subscription account carries, folded locally and stamped with vendor word.
 *
 * @summary Everything but `reported` reads what this machine sent: the burn folds the local rows,
 * the record is the account's own busiest window that already closed, and the weekly row never
 * claims a close because no honest weekly boundary exists. Rows the ledger has not folded yet ride
 * in beside the buckets, so the open hour still burns. A vendor's own reading is set beside that
 * fold rather than over it, so an account no provider answers for keeps every local figure it had.
 */
export function quotaWindowsOf(
  buckets: readonly UsageBucket[],
  liveRows: readonly LogRow[],
  now: number,
  reported: PlanUsageReadings,
): readonly QuotaWindow[] {
  return subscriptionAccountsIn(buckets).flatMap((account) => {
    const burns = burnsOf(account.accountId, buckets, liveRows);
    const standing = { ...account, now, reading: reported[account.accountId] };

    return [
      windowRowOf(standing, '5h', foldedWindows(burns, FIVE_HOURS_MS)),
      windowRowOf(standing, 'week', foldedWindows(burns, A_WEEK_MS)),
    ];
  });
}
