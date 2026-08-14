import type { IpcEventPayload } from '@recompose/contracts';

import { aPushLine } from './fake-engine-pushes';

type LaunchRefused = IpcEventPayload<'subscriptions:launch-refused'>;

const launchRefusedLine = aPushLine<LaunchRefused>();

export function forgetLaunchRefusedListeners(): void {
  launchRefusedLine.forget();
}

export function listenForLaunchRefusals(listener: (refused: LaunchRefused) => void): () => void {
  return launchRefusedLine.listen(listener);
}

/**
 * Pushes the news that no terminal opened, the way the main process would.
 *
 * @summary Reach for it in a story or a spec that has to show the wait explaining itself, with
 * nothing on screen having been pressed.
 */
export function emitLaunchRefused(refused: LaunchRefused): void {
  launchRefusedLine.emit(refused);
}
