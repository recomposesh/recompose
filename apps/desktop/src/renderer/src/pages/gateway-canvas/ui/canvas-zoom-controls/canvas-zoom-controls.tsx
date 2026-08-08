import { Controls, useReactFlow } from '@xyflow/react';

type CanvasZoomControlsProps = {
  /** Receives the ask to arrange the canvas afresh, which the viewport cannot answer on its own. */
  onTidy: () => void;
};

const cluster =
  'm-4 gap-1 rounded-canvas-card border border-line-subtle bg-canvas-card p-zoom-tools shadow-canvas-card';

const tool = 'push-button focus-ring';

function pressing(move: () => Promise<boolean>): () => void {
  return () => {
    void move();
  };
}

/**
 * The tools cluster in the canvas corner, carrying every act the viewport answers to.
 *
 * @summary Reach for it wherever the canvas stands, so zoom and arrangement have a visible home
 * rather than living only in the menu bar. The tools stand on the shipped push button, they answer
 * a keyboard as readily as a pointer, and no lock rides along, because the canvas is never frozen.
 */
export function CanvasZoomControls({ onTidy }: CanvasZoomControlsProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  return (
    <Controls
      aria-label="Canvas tools"
      className={cluster}
      orientation="horizontal"
      position="bottom-left"
      showFitView={false}
      showInteractive={false}
      showZoom={false}
    >
      <button className={tool} onClick={pressing(zoomIn)} type="button">
        Zoom in
      </button>
      <button className={tool} onClick={pressing(zoomOut)} type="button">
        Zoom out
      </button>
      <button className={tool} onClick={pressing(fitView)} type="button">
        Zoom to fit
      </button>
      <button className={tool} onClick={onTidy} type="button">
        Tidy
      </button>
    </Controls>
  );
}
