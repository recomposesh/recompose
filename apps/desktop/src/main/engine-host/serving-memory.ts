import type { EngineStates } from '@recompose/contracts';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { writeJsonAtomic } from '../storage/json-file';

function servingMemoryFile(userDataPath: string): string {
  return join(userDataPath, 'serving-gateways.json');
}

/**
 * The slugs the last run left serving, or nothing on a first run or a damaged file.
 *
 * @summary An unreadable memory means no gateway starts on its own, which is the safe launch: a
 * person can start anything by hand, and the next state change writes a good file.
 */
export async function rememberedServingSlugs(userDataPath: string): Promise<string[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(servingMemoryFile(userDataPath), 'utf8'));

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((slug): slug is string => typeof slug === 'string');
  } catch {
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

      writeJsonAtomic(servingMemoryFile(userDataPath), runningSlugs(states)).catch(
        (error: unknown) => {
          console.error('recompose could not keep which gateways serve', error);
        },
      );
    },
    close: () => {
      closed = true;
    },
  };
}
