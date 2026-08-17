import type { UpdateState } from '@recompose/contracts';

export type UpdaterSignal =
  | { kind: 'available'; version: string }
  | { kind: 'downloaded'; version: string }
  | { kind: 'cancelled' }
  | { kind: 'failed'; reason: string };

function startedDownloading(state: UpdateState, version: string): UpdateState {
  return state.standing === 'downloading' && state.version === version
    ? state
    : { standing: 'downloading', version };
}

function settledBack(state: UpdateState): UpdateState {
  return state.standing === 'quiet' ? state : { standing: 'quiet' };
}

/**
 * Folds one updater signal into the standing state.
 *
 * @summary Ready absorbs every signal, so a later check can never restart the download of the
 * version already on disk and discard it (electron-builder#3003, #2006). The person's restart is
 * not a signal here: it leaves through quitAndInstall rather than through the fold.
 */
export function nextUpdateState(state: UpdateState, signal: UpdaterSignal): UpdateState {
  if (state.standing === 'ready') {
    return state;
  }

  if (signal.kind === 'downloaded') {
    return { standing: 'ready', version: signal.version };
  }

  if (signal.kind === 'available') {
    return startedDownloading(state, signal.version);
  }

  return settledBack(state);
}
