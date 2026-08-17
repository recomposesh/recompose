import type { UpdateState } from '@recompose/contracts';

type UpdateStateListener = (state: UpdateState) => void;

const listeners = new Set<UpdateStateListener>();

export function listenForUpdateStates(listener: UpdateStateListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function emitUpdateState(state: UpdateState): void {
  for (const listener of listeners) {
    listener(state);
  }
}

export function forgetUpdateStateListeners(): void {
  listeners.clear();
}
