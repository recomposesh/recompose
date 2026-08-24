import type { AccountKind } from './accounts';
import type { LogRow } from './engine-logs';
import type { UsageMeasures, UsageTuple } from './usage';

const FIRST_FAILING_STATUS = 400;

const NOTHING_MEASURED = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };

/** The measures a bucket opens at, every count standing on zero. */
export function emptyUsageMeasures(): UsageMeasures {
  return {
    requests: 0,
    failed: 0,
    answered: 0,
    durationMsSum: 0,
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 0 },
  };
}

function tokensWith(
  held: UsageMeasures['tokens'],
  split: LogRow['usage'],
  total: number,
): UsageMeasures['tokens'] {
  const measured = split ?? NOTHING_MEASURED;

  return {
    input: held.input + measured.input,
    output: held.output + measured.output,
    cacheRead: held.cacheRead + measured.cacheRead,
    cacheWrite: held.cacheWrite + measured.cacheWrite,
    reasoning: held.reasoning + measured.reasoning,
    total: held.total + total,
  };
}

/**
 * The measures after one settled row, which is the one accrual rule every plane folds by.
 *
 * @summary The ledger in main and the live plane in the renderer both count through here, so a
 * request can never read differently across the seam: a failing status counts as failed, a row
 * with a duration counts as answered, and a split-less row accrues its total alone.
 */
export function accruedMeasures(held: UsageMeasures, row: LogRow): UsageMeasures {
  return {
    requests: held.requests + 1,
    failed: held.failed + (row.status >= FIRST_FAILING_STATUS ? 1 : 0),
    answered: held.answered + (row.durationMs === undefined ? 0 : 1),
    durationMsSum: held.durationMsSum + (row.durationMs ?? 0),
    tokens: tokensWith(held.tokens, row.usage, row.tokens ?? 0),
  };
}

/** Two measure sets taken together, every count and the whole token split summed. */
export function summedUsageMeasures(held: UsageMeasures, arriving: UsageMeasures): UsageMeasures {
  return {
    requests: held.requests + arriving.requests,
    failed: held.failed + arriving.failed,
    answered: held.answered + arriving.answered,
    durationMsSum: held.durationMsSum + arriving.durationMsSum,
    tokens: {
      input: held.tokens.input + arriving.tokens.input,
      output: held.tokens.output + arriving.tokens.output,
      cacheRead: held.tokens.cacheRead + arriving.tokens.cacheRead,
      cacheWrite: held.tokens.cacheWrite + arriving.tokens.cacheWrite,
      reasoning: held.tokens.reasoning + arriving.tokens.reasoning,
      total: held.tokens.total + arriving.tokens.total,
    },
  };
}

/**
 * The domain tuple one row accrues under.
 *
 * @summary Everything past the gateway stays optional because a gateway-raised failure reached no
 * account, and the kind is stamped at accrual time so a cost basis survives the account's later
 * deletion or rename. The live plane folds without a kind, which is why it never prices.
 */
function servedLevels(row: LogRow, accountKind: AccountKind | undefined): Partial<UsageTuple> {
  return {
    ...(row.providerModel === undefined ? {} : { providerModel: row.providerModel }),
    ...(row.accountId === undefined ? {} : { accountId: row.accountId }),
    ...(accountKind === undefined ? {} : { accountKind }),
  };
}

export function rowUsageTuple(
  row: LogRow,
  accountKind?: AccountKind,
  contextOverTokens?: number,
): UsageTuple {
  return {
    gateway: row.gateway,
    ...(row.virtualModel === undefined ? {} : { virtualModel: row.virtualModel }),
    ...(row.provider === undefined ? {} : { provider: row.provider }),
    ...servedLevels(row, accountKind),
    ...(contextOverTokens === undefined ? {} : { contextOverTokens }),
  };
}

/**
 * The prompt one request handed the model, which is every token it read.
 *
 * @summary Cached tokens count: a vendor quoting a long-context rate measures the context it
 * loaded, not the share of it that arrived fresh. What the model wrote back is not part of the
 * prompt it read, so output and reasoning stay out however large they run.
 */
function promptTokensOf(row: LogRow): number {
  const measured = row.usage;

  return measured === undefined ? 0 : measured.input + measured.cacheRead + measured.cacheWrite;
}

/**
 * The context threshold one request rose above, or nothing where it stayed under every one.
 *
 * @summary The highest threshold wins, because a vendor publishing two of them charges the rate of
 * the band a prompt lands in rather than the first one it passed. A prompt sitting exactly on a
 * threshold stays under it, which is how every vendor quotes the band: above 200K, not from it.
 */
export function contextTierOf(row: LogRow, thresholds: readonly number[]): number | undefined {
  const prompt = promptTokensOf(row);

  return thresholds
    .filter((threshold) => prompt > threshold)
    .sort((a, b) => b - a)
    .at(0);
}
