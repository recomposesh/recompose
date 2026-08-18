import type { EngineStates } from '@recompose/contracts';

import { join } from 'node:path';

import {
  isRecord,
  newerSchemaVersion,
  quarantineFile,
  readJsonWithQuarantine,
  writeJsonAtomic,
} from '../storage/json-file';

const SERVING_MEMORY_VERSION = 1;

function servingMemoryFile(userDataPath: string): string {
  return join(userDataPath, 'serving-gateways.json');
}

function slugsAmong(named: unknown): string[] | undefined {
  return Array.isArray(named)
    ? named.filter((slug): slug is string => typeof slug === 'string')
    : undefined;
}

/**
 * The slugs one stored memory names, whichever era wrote it, or nothing when it names none.
 *
 * @summary A memory written before this file carried a version is a bare list, and every one of
 * those on disk is a good file rather than a damaged one, so it is read for its slugs instead of
 * being moved aside. Reading it costs nothing to keep, because the next state change rewrites the
 * document at the version this build stores.
 */
function servingNamed(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    return slugsAmong(raw);
  }

  if (!isRecord(raw)) {
    return undefined;
  }

  return raw['schemaVersion'] === SERVING_MEMORY_VERSION ? slugsAmong(raw['serving']) : undefined;
}

async function servingSlugsRead(
  filePath: string,
  onCorrupt: (quarantinedPath: string) => void,
): Promise<string[]> {
  const raw = await readJsonWithQuarantine(filePath, onCorrupt);

  if (raw === undefined || newerSchemaVersion(raw, SERVING_MEMORY_VERSION) !== undefined) {
    return [];
  }

  const serving = servingNamed(raw);

  if (serving !== undefined) {
    return serving;
  }

  await quarantineFile(filePath, onCorrupt);

  return [];
}

/**
 * The slugs the last run left serving, or nothing on a first run or a memory this build can't read.
 *
 * @summary An unreadable memory means no gateway starts on its own, which is the safe launch: a
 * person can start anything by hand, and the next state change writes a good file. That holds for
 * every way the read can fail, which is why the whole of it answers nothing rather than throwing:
 * this runs on the launch path, and a memory of which gateways served is never worth failing a
 * launch over. A memory a newer build wrote is left exactly where it stands, because moving it aside
 * would cost that build its own memory the next time a person goes back to it.
 */
export async function rememberedServingSlugs(
  userDataPath: string,
  onCorrupt?: (quarantinedPath: string) => void,
): Promise<string[]> {
  try {
    return await servingSlugsRead(
      servingMemoryFile(userDataPath),
      onCorrupt ?? ((): undefined => undefined),
    );
  } catch (refusal: unknown) {
    console.error('recompose could not read which gateways served last', refusal);

    return [];
  }
}

function runningSlugs(states: EngineStates): string[] {
  const serving: string[] = [];

  for (const [slug, state] of Object.entries(states)) {
    if (state.status === 'running') {
      serving.push(slug);
    }
  }

  return serving;
}

export type ServingMemory = {
  keep: (states: EngineStates) => void;
  close: () => void;
};

/**
 * Keeps which gateways serve right now, so the next launch stands the same ones back up.
 *
 * @summary Closing the memory must come before the engine child dies at quit, because the child's
 * exit reports every gateway stopped, and a memory still listening would honestly record that
 * nothing was serving the instant after the person quit an app that was serving plenty.
 */
export function servingMemoryKeeper(userDataPath: string): ServingMemory {
  let closed = false;

  return {
    keep: (states) => {
      if (closed) {
        return;
      }

      writeJsonAtomic(servingMemoryFile(userDataPath), {
        schemaVersion: SERVING_MEMORY_VERSION,
        serving: runningSlugs(states),
      }).catch((error: unknown) => {
        console.error('recompose could not keep which gateways serve', error);
      });
    },
    close: () => {
      closed = true;
    },
  };
}
