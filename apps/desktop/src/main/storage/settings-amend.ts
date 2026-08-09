import type { Settings, SettingsPatch } from '@recompose/contracts';

import { withSettingsPatch } from '@recompose/contracts';

import { loadSettingsFile, saveSettingsFile } from './settings-store';

export async function amendStoredSettings(
  settingsFile: string,
  onCorrupt: (quarantinedPath: string) => void,
  patch: SettingsPatch,
): Promise<Settings> {
  const stored = await loadSettingsFile(settingsFile, onCorrupt);
  const amended = withSettingsPatch(stored, patch);

  await saveSettingsFile(settingsFile, amended);

  return amended;
}

/**
 * Writes down that a gateway served its first request, once.
 *
 * @summary Answers the amended document on the first request and nothing on every later one, so
 * the caller pushes at most one change and the file takes at most one write per profile.
 */
export async function recordFirstRequestServed(
  settingsFile: string,
  onCorrupt: (quarantinedPath: string) => void,
): Promise<Settings | null> {
  const stored = await loadSettingsFile(settingsFile, onCorrupt);

  if (stored.firstRequestServed) {
    return null;
  }

  return amendStoredSettings(settingsFile, onCorrupt, { firstRequestServed: true });
}

/**
 * The observer a grant latch calls, wired to the record and whoever reflects it.
 *
 * @summary The write happens off the grant path, because a turn must never wait on a settings
 * file. A record that fails is written down and the next grant is not retried here: the latch
 * already closed, and the checklist heals on the next profile read.
 */
export function firstRequestReporter(
  settingsFile: () => string,
  onCorrupt: (quarantinedPath: string) => void,
  reflect: (settings: Settings) => void,
): () => void {
  return () => {
    recordFirstRequestServed(settingsFile(), onCorrupt)
      .then((recorded) => {
        if (recorded !== null) {
          reflect(recorded);
        }
      })
      .catch((error: unknown) => {
        console.error('recompose could not write down the first served request.', error);
      });
  };
}
