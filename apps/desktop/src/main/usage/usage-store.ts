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
import { writingInTurn } from '../storage/writing-in-turn';
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
 *
 * A write the disk refuses leaves the ledger unwritten and the memory unpruned, so the next flush
 * carries everything the failed one owed rather than a launch's traffic disappearing on one bad
 * write, and the refusal is written down rather than dropped into a promise nobody reads.
 *
 * The revision is what keeps a row that settled mid-write. A flush names the revision its snapshot
 * covered, and only that revision reaches `writtenRevision`, so a row accrued while the disk was
 * busy still reads as unwritten. The pruned snapshot replaces memory only where nothing moved
 * behind it, because writing it back over a newer ledger would drop that row from the readings too.
 */
type LedgerDesk = { ledger: UsageLedger; revision: number; writtenRevision: number };

type RetentionEdge = () => Promise<number>;

function ledgerWrites(deps: UsageStoreDeps, desk: LedgerDesk, retentionEdge: RetentionEdge) {
  return writingInTurn(async () => {
    if (desk.revision === desk.writtenRevision) {
      return;
    }

    const edge = await retentionEdge();
    const covered = desk.revision;
    const written = prunedBefore(desk.ledger, edge);

    await writeJsonAtomic(deps.file, written);
    desk.writtenRevision = covered;

    if (desk.revision === covered) {
      desk.ledger = written;
    }
  });
}

export async function openUsageStore(deps: UsageStoreDeps): Promise<UsageStore> {
  const retentionEdge = async () => Date.now() - (await deps.retentionDays()) * DAY_MS;

  const loaded = await loadLedger(deps);
  const ledger = prunedBefore(loaded, await retentionEdge());
  const desk: LedgerDesk = {
    ledger,
    revision: ledger.buckets.length === loaded.buckets.length ? 0 : 1,
    writtenRevision: 0,
  };
  const flush = ledgerWrites(deps, desk, retentionEdge);
  const cadence = flushingWhenQuiet(() => {
    flush().catch((failure: unknown) => {
      console.error(`recompose could not write the usage ledger to ${deps.file}.`, failure);
    });
  });

  return {
    accrue: (row) => {
      desk.ledger = accrued(desk.ledger, row, deps.accountKindOf(row.accountId));
      desk.revision += 1;
      cadence.watchForQuiet();
    },
    report: async (ask) => {
      const { range } = ask;
      const hours = hourBucketsWithin(desk.ledger, range, Date.now());
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
    heldBuckets: () => desk.ledger.buckets,
    flushNow: async () => {
      cadence.stopWatching();

      return flush();
    },
  };
}
