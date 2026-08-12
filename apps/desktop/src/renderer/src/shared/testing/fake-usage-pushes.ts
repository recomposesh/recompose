import type { IpcEventPayload } from '@recompose/contracts';

import { aPushLine } from './fake-engine-pushes';

const usageCommandLine = aPushLine<IpcEventPayload<'usage:command'>>();

export function forgetUsageCommandListeners(): void {
  usageCommandLine.forget();
}

export function listenForUsageCommands(
  listener: (command: IpcEventPayload<'usage:command'>) => void,
): () => void {
  return usageCommandLine.listen(listener);
}

/**
 * Pushes a Usage menu command at everything listening, the way the main process would.
 *
 * @summary Reach for it in a story or a spec that has to show the menu bar driving the explorer,
 * with nothing on screen having been pressed.
 */
export function emitUsageCommand(command: IpcEventPayload<'usage:command'>): void {
  usageCommandLine.emit(command);
}
