import { z } from 'zod';

import { accountKindSchema } from './accounts';
import { gatewaySlugSchema, modelAliasSchema } from './gateway-config';
import { nonBlankString } from './non-blank';
import { planUsageWindowSchema } from './plan-usage';

const wholeCount = z.number().int().nonnegative();

/** The ranges the usage explorer offers, which is the whole vocabulary a report answers. */
export const usageRangeSchema = z.enum(['24h', '7d', '30d']);

export type UsageRange = z.infer<typeof usageRangeSchema>;

/**
 * The ranges the usage address accepts, in the order every surface lists them.
 *
 * @summary The order is contractual: the menu's listing order, the range popover's order, and the
 * accelerator digit assignment all read it. It stands beside `usageRangeSchema` rather than
 * replacing it, because how far a report read reaches and what the address accepts are two
 * decisions that look alike.
 */
export const usageSearchRangeSchema = z.enum([
  '1h',
  '24h',
  '7d',
  '30d',
  'this-week',
  'this-month',
  'custom',
]);

export type UsageSearchRange = z.infer<typeof usageSearchRangeSchema>;

/** The widths a bucket comes in: hours as stored, days as folded at answer time. */
export const usageBucketWidthSchema = z.enum(['hour', 'day']);

export type UsageBucketWidth = z.infer<typeof usageBucketWidthSchema>;

const MINUTES_IN_A_DAY = 1440;

/**
 * What one report read asks for.
 *
 * @summary The range names how far back to reach. A window narrower than the range's own default
 * width asks for hours, so a custom afternoon inside last week still reads hour by hour. The day
 * offset is the reader's own minutes from UTC, which is what lets a folded day break at the
 * reader's midnight instead of at UTC's.
 */
export const usageReportAskSchema = z.strictObject({
  range: usageRangeSchema,
  bucketWidth: usageBucketWidthSchema.optional(),
  dayOffsetMinutes: z.number().int().gt(-MINUTES_IN_A_DAY).lt(MINUTES_IN_A_DAY).optional(),
});

export type UsageReportAsk = z.infer<typeof usageReportAskSchema>;

/**
 * The domain tuple one bucket accrues under.
 *
 * @summary The tuple is the whole domain hierarchy, so every group-by the explorer offers folds
 * out of the same buckets. A gateway-raised request reached no account, which is why everything
 * past the gateway stays optional, and `accountKind` is stamped at accrual time so a cost basis
 * survives the account's later deletion or rename.
 */
export const usageTupleSchema = z.strictObject({
  gateway: gatewaySlugSchema,
  virtualModel: modelAliasSchema.optional(),
  provider: nonBlankString.optional(),
  providerModel: nonBlankString.optional(),
  accountId: nonBlankString.optional(),
  accountKind: accountKindSchema.optional(),
});

export type UsageTuple = z.infer<typeof usageTupleSchema>;

/**
 * What one bucket counted.
 *
 * @summary Counts only ever accrue, so every measure reads nonnegative. `answered` counts the
 * requests that carried a duration, which is the denominator an average latency divides by, and
 * the token object keeps the five-way split beside its total so a cached share never needs a
 * second reading.
 */
export const usageMeasuresSchema = z.strictObject({
  requests: wholeCount,
  failed: wholeCount,
  answered: wholeCount,
  durationMsSum: z.number().nonnegative(),
  tokens: z.strictObject({
    input: wholeCount,
    output: wholeCount,
    cacheRead: wholeCount,
    cacheWrite: wholeCount,
    reasoning: wholeCount,
    total: wholeCount,
  }),
});

export type UsageMeasures = z.infer<typeof usageMeasuresSchema>;

/** One hour of one tuple, keyed by the UTC hour it opened at. */
export const usageBucketSchema = z.strictObject({
  start: wholeCount,
  tuple: usageTupleSchema,
  measures: usageMeasuresSchema,
});

export type UsageBucket = z.infer<typeof usageBucketSchema>;

/** Where the prices behind a cost figure came from, and how fresh they stood. */
export const pricingProvenanceSchema = z.strictObject({
  source: z.enum(['synced', 'bundled']),
  fetchedAt: wholeCount.optional(),
});

export type PricingProvenance = z.infer<typeof pricingProvenanceSchema>;

/**
 * One day of cost for one tuple, in integer micro-dollars.
 *
 * @summary Cost exists at day width only, which this shape enforces by never appearing on an hour
 * bucket. A billed figure prices key-served traffic, an equivalent figure prices
 * subscription-served traffic and always prints behind the approximation prefix, and the two never
 * merge into one number. Integer micro-dollars keep summed figures exact until the one rounding a
 * print takes.
 */
export const usageDayCostSchema = z.strictObject({
  dayStart: wholeCount,
  tuple: usageTupleSchema,
  billedMicroDollars: wholeCount.optional(),
  equivalentMicroDollars: wholeCount.optional(),
});

export type UsageDayCost = z.infer<typeof usageDayCostSchema>;

/** A model the price map could not name, surfaced by request count rather than as zero dollars. */
export const priceMissSchema = z.strictObject({
  provider: nonBlankString.optional(),
  providerModel: nonBlankString,
  requests: wholeCount,
});

export type PriceMiss = z.infer<typeof priceMissSchema>;

/**
 * Everything one range read answers.
 *
 * @summary The report returns closed buckets only, so the live plane the renderer already holds
 * can never double count against it. Tuple-keyed buckets ride whole and the renderer folds its own
 * group-bys, which is why no group-by parameter exists. `oldestRetainedStart` names the retention
 * edge so the chart can annotate where history genuinely ends.
 */
export const usageReportSchema = z.strictObject({
  range: usageRangeSchema,
  bucketWidth: usageBucketWidthSchema,
  buckets: z.array(usageBucketSchema).readonly(),
  dayCosts: z.array(usageDayCostSchema).readonly(),
  priceMisses: z.array(priceMissSchema).readonly(),
  pricing: pricingProvenanceSchema,
  oldestRetainedStart: wholeCount.optional(),
});

export type UsageReport = z.infer<typeof usageReportSchema>;

/**
 * One subscription account's window burn, derived from local logs.
 *
 * @summary The burn always reads what this machine sent, anchored where traffic followed five
 * quiet hours, and carries the account's own busiest earlier window as the record a meter measures
 * against. `reported` is the one figure here a vendor answered for: where a provider names how much
 * of the window is spent, the meter reads that share instead of the record, and where no provider
 * says, nothing here claims official remaining quota. A window that never opened carries burn alone.
 */
export const quotaWindowSchema = z.strictObject({
  accountId: nonBlankString,
  provider: nonBlankString,
  length: z.enum(['5h', 'week']),
  openedAt: wholeCount.optional(),
  closesAt: wholeCount.optional(),
  burnTokens: wholeCount,
  record: z
    .strictObject({
      burnTokens: wholeCount,
      openedAt: wholeCount,
    })
    .optional(),
  reported: planUsageWindowSchema.omit({ length: true }).extend({ readAt: wholeCount }).optional(),
});

export type QuotaWindow = z.infer<typeof quotaWindowSchema>;

/**
 * One balance read as the upstream answered it, stamped with the instant it was taken.
 *
 * @summary What is left is the one figure every vendor reports, so it is the only one required.
 * Some name what was bought and what was spent beside it and some name neither, and a card that
 * demanded both would have to invent them for the vendors that report a balance alone. The currency
 * rides along because one vendor answers in yuan and another in dollars, and a figure printed under
 * the wrong sign is worse than one nobody printed.
 */
export const balanceReadingSchema = z.strictObject({
  remaining: z.number().nonnegative(),
  added: z.number().nonnegative().optional(),
  spent: z.number().nonnegative().optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/u, 'must be a three-letter currency code')
    .optional(),
  readAt: wholeCount,
});

export type BalanceReading = z.infer<typeof balanceReadingSchema>;

/**
 * One aggregator account's balance card, either a stamped reading or the failure that met it.
 *
 * @summary A failed read carries its failure sentence and no reading, so a stale number never
 * poses as a fresh one, and the staleness label on a good reading is data rather than guesswork.
 */
export const accountBalanceSchema = z.strictObject({
  accountId: nonBlankString,
  reading: balanceReadingSchema.optional(),
  failure: nonBlankString.optional(),
});

export type AccountBalance = z.infer<typeof accountBalanceSchema>;

export const USAGE_LEDGER_VERSION = 1;

/**
 * The usage ledger as `usage.json` holds it.
 *
 * @summary `accruedThrough` is the watermark no replayed row crosses twice, and `recentRowIds`
 * guards the rows near it, so a restart backfill can never double count. The version opens its own
 * migration chain, and a newer document refuses loudly rather than being reinterpreted.
 */
export const usageLedgerSchema = z.strictObject({
  schemaVersion: z.literal(USAGE_LEDGER_VERSION),
  accruedThrough: wholeCount,
  recentRowIds: z.array(nonBlankString).readonly(),
  buckets: z.array(usageBucketSchema).readonly(),
});

export type UsageLedger = z.infer<typeof usageLedgerSchema>;
