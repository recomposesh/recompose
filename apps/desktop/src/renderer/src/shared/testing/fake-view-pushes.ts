import type { IpcEventPayload, IpcRequest } from '@recompose/contracts';

import { aPushLine } from './fake-engine-pushes';

const viewCommandLine = aPushLine<IpcEventPayload<'view:command'>>();

export function forgetViewCommandListeners(): void {
  viewCommandLine.forget();
}

export function listenForViewCommands(
  listener: (command: IpcEventPayload<'view:command'>) => void,
): () => void {
  return viewCommandLine.listen(listener);
}

/**
 * Pushes a View menu toggle at everything listening, the way the main process would.
 *
 * @summary Reach for it in a spec that has to show the menu bar driving a surface toggle, with
 * nothing on screen having been pressed.
 */
export function emitViewCommand(command: IpcEventPayload<'view:command'>): void {
  viewCommandLine.emit(command);
}

let reported: IpcRequest<'system:surface-toggles'>[] = [];

export function noteReportedSurfaceToggles(toggles: IpcRequest<'system:surface-toggles'>): void {
  reported.push(toggles);
}

/** Every surface snapshot the fake bridge has carried out, oldest first. */
export function reportedSurfaceToggles(): readonly IpcRequest<'system:surface-toggles'>[] {
  return reported;
}

export function forgetReportedSurfaceToggles(): void {
  reported = [];
}
