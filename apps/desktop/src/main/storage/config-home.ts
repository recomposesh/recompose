import { access, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';

import { resolveUserDataOverride } from '../user-data-override';

/**
 * Where recompose keeps everything a person owns: `~/.recompose` on every platform.
 *
 * @summary The home folder resolves per platform, so this lands at `%USERPROFILE%\.recompose` on
 * Windows without naming the platform here. An override in the environment wins outright, because
 * the end-to-end runs isolate a whole profile through it.
 */
export function resolveConfigHome(
  env: Record<string, string | undefined>,
  homeFolder: string,
): string {
  return resolveUserDataOverride(env) ?? join(homeFolder, '.recompose');
}

const OWNED_ENTRIES = [
  'gateways',
  'settings.json',
  'accounts.json',
  'vault.bin',
  'serving-gateways.json',
  'subscriptions',
  'logs',
] as const;

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

async function stands(path: string): Promise<boolean> {
  try {
    await access(path);

    return true;
  } catch {
    return false;
  }
}

async function adoptEntry(
  legacyUserData: string,
  configHome: string,
  entry: string,
): Promise<void> {
  const adopted = join(configHome, entry);

  if (await stands(adopted)) {
    return;
  }

  try {
    await rename(join(legacyUserData, entry), adopted);
  } catch (error) {
    if (!isErrnoException(error) || error.code !== 'ENOENT') {
      console.error(`recompose could not adopt ${entry} into ${configHome}`, error);
    }
  }
}

/**
 * Moves the documents an earlier build left in Electron's userData into the config home, once.
 *
 * @summary Every entry moves on its own and one already standing in the new home stays put, so a
 * move interrupted halfway finishes on the next launch instead of failing it. The Electron caches
 * stay behind on purpose: they are the browser's litter, not the person's configuration.
 */
export async function adoptLegacyConfigHome(
  legacyUserData: string,
  configHome: string,
): Promise<void> {
  if (legacyUserData === configHome) {
    return;
  }

  await mkdir(configHome, { recursive: true });

  await Promise.all(
    OWNED_ENTRIES.map(async (entry) => adoptEntry(legacyUserData, configHome, entry)),
  );
}
