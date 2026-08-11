import type { IpcEventPayload } from '@recompose/contracts';

import { useReactFlow } from '@xyflow/react';
import { useEffect } from 'react';

import { subscribeToCanvasAsks } from '../../../shared/lib';

type CanvasCommandsProps = {
  /** Receives the ask to arrange the canvas afresh, which the viewport cannot answer on its own. */
  onTidy: () => void;
};

type CanvasCommand = IpcEventPayload<'canvas:command'>;

type CanvasEffects = {
  fitView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  onTidy: () => void;
};

/**
 * What this surface does with each command the one channel can carry.
 *
 * @summary Naming every command as a key rather than a case makes the set exhaustive at the type
 * level, so a command added to the contract fails the build here until this surface says what it
 * does with it, rather than falling through a switch unanswered.
 */
function actsOn(canvas: CanvasEffects): Record<CanvasCommand, () => void> {
  return {
    'zoom-in': canvas.zoomIn,
    'zoom-out': canvas.zoomOut,
    'zoom-to-fit': canvas.fitView,
    tidy: canvas.onTidy,
    'toggle-logs': () => undefined,
  };
}

/**
 * The ear the canvas turns toward the Gateway menu and the toolbar, answering every command.
 *
 * @summary Mount it inside the flow it commands, because the viewport it drives lives in the
 * flow's own context. The zoom commands move the viewport where they arrive, and Tidy travels on
 * to the arrangement, since where nodes stand is the composition's business rather than the
 * camera's. It renders nothing: the menu and the toolbar are the controls, the canvas the effect.
 *
 * The drawer toggle rides the same channel, because one channel carries every Gateway menu act,
 * and it passes through here untouched: the logs drawer stands beside the flow rather than inside
 * it, so the surface that owns the drawer answers that command instead.
 */
export function CanvasCommands({ onTidy }: CanvasCommandsProps): null {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  useEffect(() => {
    const acts = actsOn({
      fitView: () => {
        void fitView();
      },
      zoomIn: () => {
        void zoomIn();
      },
      zoomOut: () => {
        void zoomOut();
      },
      onTidy,
    });

    return window.recomposeEvents['canvas:command']((command) => {
      acts[command]();
    });
  }, [fitView, zoomIn, zoomOut, onTidy]);

  useEffect(
    () =>
      subscribeToCanvasAsks(() => {
        onTidy();
      }),
    [onTidy],
  );

  return null;
}
