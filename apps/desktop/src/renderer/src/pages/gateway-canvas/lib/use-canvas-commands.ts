import { useReactFlow } from '@xyflow/react';
import { useEffect } from 'react';

type CanvasCommandsProps = {
  /** Receives the ask to arrange the canvas afresh, which the viewport cannot answer on its own. */
  onTidy: () => void;
};

/**
 * The ear the canvas turns toward the menu bar, answering every Canvas menu item.
 *
 * @summary Mount it inside the flow it commands, because the viewport it drives lives in the
 * flow's own context. The zoom commands move the viewport where they arrive, and Tidy travels on
 * to the arrangement, since where nodes stand is the composition's business rather than the
 * camera's. It renders nothing: the menu is the control and the canvas is the effect.
 */
export function CanvasCommands({ onTidy }: CanvasCommandsProps): null {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  useEffect(
    () =>
      window.recomposeEvents['canvas:command']((command) => {
        switch (command) {
          case 'zoom-in': {
            void zoomIn();
            break;
          }

          case 'zoom-out': {
            void zoomOut();
            break;
          }

          case 'zoom-to-fit': {
            void fitView();
            break;
          }

          case 'tidy': {
            onTidy();
            break;
          }
        }
      }),
    [fitView, zoomIn, zoomOut, onTidy],
  );

  return null;
}
