import type { Settings } from '@recompose/contracts';

type SettingsListener = (settings: Settings) => void;

const settingsListeners = new Set<SettingsListener>();

export function listenForSettingsChanges(listener: SettingsListener): () => void {
  settingsListeners.add(listener);

  return () => {
    settingsListeners.delete(listener);
  };
}

/**
 * Pushes a settings document at everything listening, the way the main process would.
 *
 * @summary Reach for it in a story or a spec that has to show a save arriving from outside the
 * window: another window, the application menu, or the first served request.
 */
export function emitSettingsChanged(settings: Settings): void {
  for (const listener of settingsListeners) {
    listener(settings);
  }
}
