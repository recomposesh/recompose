import type { BalanceReading } from '@recompose/contracts';

import { balanceReadingSchema } from '@recompose/contracts';
import { z } from 'zod';

import { flushingWhenQuiet } from '../storage/flush-cadence';
import {
  isRecord,
  newerSchemaVersion,
  readJsonWithQuarantine,
  writeJsonAtomic,
} from '../storage/json-file';
import { writingInTurn } from '../storage/writing-in-turn';

const BALANCE_VERSION = 1;

/**
 * How long a stored balance is worth restoring.
 *
 * @summary The charts above the card reach 90 days, so a balance outliving them would be the one
 * figure on the page with no history behind it. The card prints how long ago the reading was taken,
 * which is what keeps a restored figure honest for as long as it stands.
 */
const KEPT_FOR_DAYS = 90;

const A_DAY_MS = 86_400_000;

export class BalanceNewerSchemaError extends Error {
  constructor(named: number) {
    super(`The balances were written by a newer recompose (schema ${String(named)}).`);
    this.name = 'BalanceNewerSchemaError';
  }
}

export type BalanceStoreDeps = {
  file: string;
  onCorrupt?: (quarantinedPath: string) => void;
};

type KeptBalance = { accountId: string; reading: BalanceReading };

export type BalanceStore = {
  keep: (accountId: string, reading: BalanceReading) => void;
  restored: () => readonly KeptBalance[];
  flushNow: () => Promise<void>;
};

const keptBalancesSchema = z.array(
  z.strictObject({ accountId: z.string().trim().min(1), reading: balanceReadingSchema }),
);

function keptIn(document: unknown): readonly KeptBalance[] {
  const parsed = keptBalancesSchema.safeParse(
    isRecord(document) ? document['readings'] : undefined,
  );

  return parsed.success ? parsed.data : [];
}

async function loadKept(deps: BalanceStoreDeps): Promise<readonly KeptBalance[]> {
  const raw = await readJsonWithQuarantine(deps.file, deps.onCorrupt ?? (() => undefined));
  const newer = newerSchemaVersion(raw, BALANCE_VERSION);

  if (newer !== undefined) {
    throw new BalanceNewerSchemaError(newer);
  }

  return keptIn(raw);
}

function withinRetention(kept: readonly KeptBalance[], now: number): readonly KeptBalance[] {
  return kept.filter((held) => now - held.reading.readAt <= KEPT_FOR_DAYS * A_DAY_MS);
}

/**
 * Each account's last balance reading, kept across launches in `balances.json`.
 *
 * @summary A credits endpoint answers slowly and rate limits an eager caller, so a launch throwing
 * away what it already knew would leave every card blank until the next poll landed. One reading
 * stands per account, because a card prints one balance and an older figure beside it would only
 * invite a reader to subtract two stamps. A reading aged past retention leaves at open, so the next
 * flush writes the document without it rather than carrying it forever.
 */
export async function openBalanceStore(deps: BalanceStoreDeps): Promise<BalanceStore> {
  let kept = withinRetention(await loadKept(deps), Date.now());

  const flush = writingInTurn(async () => {
    await writeJsonAtomic(deps.file, { schemaVersion: BALANCE_VERSION, readings: kept });
  });

  const cadence = flushingWhenQuiet(() => {
    flush().catch((failure: unknown) => {
      console.error(`recompose could not write the kept balances to ${deps.file}.`, failure);
    });
  });

  const flushNow = async (): Promise<void> => {
    cadence.stopWatching();

    return flush();
  };

  return {
    keep: (accountId, reading) => {
      kept = [...kept.filter((held) => held.accountId !== accountId), { accountId, reading }];
      cadence.watchForQuiet();
    },
    restored: () => kept,
    flushNow,
  };
}
