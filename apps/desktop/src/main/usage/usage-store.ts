import type {
  AccountKind,
  LogRow,
  UsageBucket,
  UsageLedger,
  UsageReport,
  UsageReportAsk,
  UsageRetentionDays,
} from '@recompose/contracts';

import { USAGE_LEDGER_VERSION, usageLedgerSchema } from '@recompose/contracts';

import { flushingWhenQuiet } from '../storage/flush-cadence';
import { newerSchemaVersion, readJsonWithQuarantine, writeJsonAtomic } from '../storage/json-file';
import {
  accrued,
  dayFolded,
  emptyUsageLedger,
  hourBucketsWithin,
  prunedBefore,
} from './usage-buckets';

const DAY_MS = 86_400_000;

export class UsageNewerSchemaError extends Error {
  constructor(named: number) {
    super(`The usage ledger was written by a newer recompose (schema ${String(named)}).`);
    this.name = 'UsageNewerSchemaError';
  }
}

export type UsageStoreDeps = {
  file: string;
  retentionDays: () => Promise<UsageRetentionDays>;
  accountKindOf: (accountId: string | undefined) => AccountKind | undefined;
  onCorrupt?: (quarantinedPath: string) => void;
};

export type UsageStore = {
  accrue: (row: LogRow) => void;
  report: (ask: UsageReportAsk) => Promise<UsageReport>;
  heldBuckets: () => readonly UsageBucket[];
  flushNow: () => Promise<void>;
};

async function loadLedger(deps: UsageStoreDeps): Promise<UsageLedger> {
  const raw = await readJsonWithQuarantine(deps.file, deps.onCorrupt ?? (() => undefined));

  if (raw === undefined) {
    return emptyUsageLedger();
  }

  const newer = newerSchemaVersion(raw, USAGE_LEDGER_VERSION);

  if (newer !== undefined) {
    throw new UsageNewerSchemaError(newer);
  }

  const parsed = usageLedgerSchema.safeParse(raw);

  return parsed.success ? parsed.data : emptyUsageLedger();
}

/**
 * The usage ledger as a running store: accrue settled rows, answer range reads, flush on its own.
 *
 * @summary Accrual mutates memory only, and the document reaches the disk on a debounce: a few
 * quiet seconds after the last row, a hard ceiling under sustained load, and immediately on
 * `flushNow` for quit and interrupt. The prune runs on load and on every flush against the live
 * retention setting, so a shortened window empties on the next write rather than waiting for a
 * restart. Reports answer from memory and never touch the disk.
 */
export async function openUsageStore(deps: UsageStoreDeps): Promise<UsageStore> {
  const retentionEdge = async () => Date.now() - (await deps.retentionDays()) * DAY_MS;

  const loaded = await loadLedger(deps);

  let ledger = prunedBefore(loaded, await retentionEdge());
  let dirty = ledger.buckets.length !== loaded.buckets.length;

  const flush = async (): Promise<void> => {
    cadence.stopWatching();

    if (!dirty) {
      return;
    }

    ledger = prunedBefore(ledger, await retentionEdge());
    dirty = false;
    await writeJsonAtomic(deps.file, ledger);
  };

  const cadence = flushingWhenQuiet(() => {
    void flush();
  });

  return {
    accrue: (row) => {
      ledger = accrued(ledger, row, deps.accountKindOf(row.accountId));
      dirty = true;
      cadence.watchForQuiet();
    },
    report: async (ask) => {
      const { range } = ask;
      const hours = hourBucketsWithin(ledger, range, Date.now());
      const width = ask.bucketWidth ?? (range === '24h' ? ('hour' as const) : ('day' as const));

      return {
        range,
        bucketWidth: width,
        buckets: width === 'hour' ? hours : dayFolded(hours, ask.dayOffsetMinutes),
        dayCosts: [],
        priceMisses: [],
        pricing: { source: 'bundled' as const },
        oldestRetainedStart: await retentionEdge(),
      };
    },
    heldBuckets: () => ledger.buckets,
    flushNow: flush,
  };
}
