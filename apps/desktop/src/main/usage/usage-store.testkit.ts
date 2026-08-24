import type { LogRow, UsageLedger } from '@recompose/contracts';

import { usageLedgerSchema } from '@recompose/contracts';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { UsageStore } from './usage-store';

import { openUsageStore } from './usage-store';

const HOUR = 3_600_000;

/** The instant every ledger story stands at: half past a closed hour, so an hour edge is exact. */
export const NOW = 1_754_600_400_000 - (1_754_600_400_000 % HOUR) + 30 * 60_000;

const CLIENT_KEY = `sha256:${'a'.repeat(64)}`;

/** One settled row a provider answered, which is what the ledger accrues. */
export function served(id: string, at: number): LogRow {
  return {
    id,
    at,
    gateway: 'relay',
    virtualModel: 'creative',
    origin: 'provider',
    method: 'POST',
    provider: 'anthropic',
    accountId: 'work',
    providerModel: 'claude-sonnet-4-5',
    status: 200,
    durationMs: 912,
    tokens: 1_820,
    usage: { input: 1_200, output: 480, cacheRead: 96, cacheWrite: 32, reasoning: 12 },
    clientKey: CLIENT_KEY,
  };
}

/** A profile holding no ledger yet, named where one would be written. */
export async function aStoreFile(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), 'recompose-usage-')), 'usage.json');
}

export async function anOpenStore(
  file: string,
  retentionDays: 7 | 30 | 90 = 30,
): Promise<UsageStore> {
  return openUsageStore({
    file,
    retentionDays: async () => Promise.resolve(retentionDays),
    accountKindOf: () => 'subscription',
  });
}

export async function storedLedger(file: string): Promise<UsageLedger> {
  return usageLedgerSchema.parse(JSON.parse(await readFile(file, 'utf8')));
}

/**
 * Reads again until the read stops throwing, which is how a story waits on a write it never awaits.
 *
 * @summary The cadence fires on a fake timer and writes on the real disk, so advancing the clock
 * returns before the file lands. Breathing between reads is what lets the write finish without the
 * story guessing at a duration.
 */
export async function eventually<Value>(read: () => Promise<Value> | Value): Promise<Value> {
  for (let breath = 0; breath < 50; breath += 1) {
    try {
      return await read();
    } catch {
      await new Promise((rested) => {
        setImmediate(rested);
      });
    }
  }

  return read();
}
