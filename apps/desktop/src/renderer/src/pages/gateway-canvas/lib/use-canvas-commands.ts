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
  zoomTo100: () => void;
  tidy: () => void;
};

/**
 * What this surface does with each command the one channel can carry.
 *
 * @summary Naming every command as a key rather than a case makes the set exhaustive at the type
 * level, so a command added to the contract fails the build here until this surface says what it
 * does with it, rather than falling through a switch unanswered. The drawer toggle, the copy, and
 * the removal pass through untouched, because the page owns those surfaces rather than the flow.
 */
function actsOn(canvas: CanvasEffects): Record<CanvasCommand, () => void> {
  return {
    'zoom-in': canvas.zoomIn,
    'zoom-out': canvas.zoomOut,
    'zoom-to-100': canvas.zoomTo100,
    'zoom-to-fit': canvas.fitView,
    tidy: canvas.tidy,
    'toggle-logs': () => undefined,
    'copy-base-url': () => undefined,
    'remove-gateway': () => undefined,
  };
}

/**
 * Arranging the canvas afresh and then framing the whole of what the arrangement made.
 *
 * @summary The reseated cards reach the flow a render after the arrangement drops, so the fit
 * waits a frame rather than framing the seats the cards have already left.
 */
function tidiedThenFramed(onTidy: () => void, fitView: () => void): () => void {
  return () => {
    onTidy();
    requestAnimationFrame(fitView);
  };
}

/**
 * The ear the canvas turns toward the Gateway menu and the toolbar, answering every command.
 *
 * @summary Mount it inside the flow it commands, because the viewport it drives lives in the
 * flow's own context. The zoom commands move the viewport where they arrive, and Tidy reaches
 * both the arrangement and the camera: cards reseated past the edge of the pane read as a press
 * that did nothing, so the one press that arranges also brings the whole composition into view.
 * It renders nothing: the menu and the toolbar are the controls, the canvas the effect.
 *
 * The drawer toggle rides the same channel, because one channel carries every Gateway menu act,
 * and it passes through here untouched: the logs drawer stands beside the flow rather than inside
 * it, so the surface that owns the drawer answers that command instead.
 */
export function CanvasCommands({ onTidy }: CanvasCommandsProps): null {
  const { fitView, zoomIn, zoomOut, zoomTo } = useReactFlow();

  useEffect(() => {
    const fits = () => {
      void fitView();
    };
    const tidy = tidiedThenFramed(onTidy, fits);
    const acts = actsOn({
      fitView: fits,
      zoomIn: () => {
        void zoomIn();
      },
      zoomOut: () => {
        void zoomOut();
      },
      zoomTo100: () => {
        void zoomTo(1);
      },
      tidy,
    });

    const unsubscribeFromCommands = window.recomposeEvents['canvas:command']((command) => {
      acts[command]();
    });
    const unsubscribeFromAsks = subscribeToCanvasAsks(tidy);

    return () => {
      unsubscribeFromCommands();
      unsubscribeFromAsks();
    };
  }, [fitView, zoomIn, zoomOut, zoomTo, onTidy]);

  return null;
}
