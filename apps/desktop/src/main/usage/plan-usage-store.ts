import type { PlanUsageReading, PlanUsageReadings, PlanUsageWindow } from '@recompose/contracts';

import { planUsageReadingsSchema } from '@recompose/contracts';

import { flushingWhenQuiet } from '../storage/flush-cadence';
import {
  isRecord,
  newerSchemaVersion,
  readJsonWithQuarantine,
  writeJsonAtomic,
} from '../storage/json-file';
import { writingInTurn } from '../storage/writing-in-turn';

export const PLAN_USAGE_VERSION = 1;

export class PlanUsageNewerSchemaError extends Error {
  constructor(named: number) {
    super(`The plan usage readings were written by a newer recompose (schema ${String(named)}).`);
    this.name = 'PlanUsageNewerSchemaError';
  }
}

export type PlanUsageStoreDeps = {
  file: string;
  onCorrupt?: (quarantinedPath: string) => void;
};

export type PlanUsageStore = {
  hold: (readings: PlanUsageReadings) => void;
  read: (now: number) => PlanUsageReadings;
  flushNow: () => Promise<void>;
};

function readingsIn(document: unknown): PlanUsageReadings {
  const parsed = planUsageReadingsSchema.safeParse(
    isRecord(document) ? document['readings'] : undefined,
  );

  return parsed.success ? parsed.data : {};
}

async function loadReadings(deps: PlanUsageStoreDeps): Promise<PlanUsageReadings> {
  const raw = await readJsonWithQuarantine(deps.file, deps.onCorrupt ?? (() => undefined));
  const newer = newerSchemaVersion(raw, PLAN_USAGE_VERSION);

  if (newer !== undefined) {
    throw new PlanUsageNewerSchemaError(newer);
  }

  return readingsIn(raw);
}

function windowsNotYetTurnedOver(
  windows: readonly PlanUsageWindow[],
  now: number,
): readonly PlanUsageWindow[] {
  return windows.filter((window) => window.resetsAt !== undefined && window.resetsAt > now);
}

function stillCurrent(held: PlanUsageReadings, now: number): PlanUsageReadings {
  const current: Record<string, PlanUsageReading> = {};

  for (const [accountId, reading] of Object.entries(held)) {
    const windows = windowsNotYetTurnedOver(reading.windows, now);

    if (windows.length > 0) {
      current[accountId] = { ...reading, windows };
    }
  }

  return current;
}

/**
 * What each account's plan last read, kept across launches in `plan-usage.json`.
 *
 * @summary The desk behind `onPlanUsage` starts every launch empty and names only the accounts it
 * has heard from since, so holding what arrives over what stands is what keeps a stored reading
 * for an account this launch hasn't sent through yet.
 */
export async function openPlanUsageStore(deps: PlanUsageStoreDeps): Promise<PlanUsageStore> {
  let held = await loadReadings(deps);
  let revision = 0;
  let writtenRevision = 0;

  const flush = writingInTurn(async () => {
    if (revision === writtenRevision) {
      return;
    }

    const covered = revision;

    await writeJsonAtomic(deps.file, { schemaVersion: PLAN_USAGE_VERSION, readings: held });
    writtenRevision = covered;
  });

  const cadence = flushingWhenQuiet(() => {
    flush().catch((failure: unknown) => {
      console.error(`recompose could not write the plan readings to ${deps.file}.`, failure);
    });
  });

  const flushNow = async (): Promise<void> => {
    cadence.stopWatching();

    return flush();
  };

  return {
    hold: (readings) => {
      held = { ...held, ...readings };
      revision += 1;
      cadence.watchForQuiet();
    },
    /**
     * @summary A share is only worth printing while the window behind it still runs, so a window
     * past its reset leaves the answer, and so does one that named no reset at all: nothing on it
     * says it's current, which is exactly how Codex reports. An account whose windows have all gone
     * drops out rather than reading as a plan at 0%, a figure no vendor ever sent.
     */
    read: (now) => stillCurrent(held, now),
    flushNow,
  };
}
