import type { EngineStates } from '@recompose/contracts';

/**
 * One states push fanned to every surface that repaints from it.
 *
 * @summary The tray, the Dock, and the menu conductor all read the same snapshot, and a surface
 * this run never installed rides as null rather than as a branch at the call site.
 */
type SurfaceRepaintSeams = {
  repaintTray: (states: EngineStates) => void;
  repaintDock: ((states: EngineStates) => void) | null;
  reflectMenu: (states: EngineStates) => void;
};

/** The tray, the Dock, and the menu conductor, each repainting from one engine push. */
export function surfaceStateRepaints(seams: SurfaceRepaintSeams): (states: EngineStates) => void {
  return fannedStateRepaints([seams.repaintTray, seams.repaintDock, seams.reflectMenu]);
}

export function fannedStateRepaints(
  repaints: readonly (((states: EngineStates) => void) | null)[],
): (states: EngineStates) => void {
  return (states) => {
    for (const repaint of repaints) {
      repaint?.(states);
    }
  };
}
