import type { ReactFlowState } from '@xyflow/react';

import { Controls, useReactFlow, useStore } from '@xyflow/react';

import { Icon, type IconName } from '../../../../shared/ui';

const cluster =
  'm-4 items-center gap-0.5 rounded-canvas-card border border-line-subtle bg-canvas-card p-zoom-tools shadow-canvas-card';

const tool =
  'flex size-hit-target items-center justify-center rounded-control text-ink-secondary focus-ring hover:bg-surface-hover active:bg-surface-pressed';

const readout =
  'flex h-hit-target items-center rounded-control border border-line-subtle bg-surface-content px-2 font-mono text-mono-value text-ink focus-ring hover:bg-surface-hover active:bg-surface-pressed';

const paintedZoom = (state: ReactFlowState) => `${String(Math.round(state.transform[2] * 100))}%`;

function pressing(move: () => Promise<boolean>): () => void {
  return () => {
    void move();
  };
}

function zoomStep(ask: string, glyph: IconName, onPress: () => void) {
  return (
    <button aria-label={ask} className={tool} onClick={onPress} type="button">
      <Icon className="size-3.5" name={glyph} />
    </button>
  );
}

/**
 * The zoom cluster in the canvas corner, drawn the way the reference draws it.
 *
 * @summary A step out, the live reading, a step in, and the fit, in one quiet pill. The reading
 * answers the viewport it stands on, so pinching and the menu both move it. Pressing the reading
 * puts the zoom back at its true size, and the fit brings the whole composition into view.
 * Arrangement is not zoom's business: Tidy lives in the toolbar above the canvas.
 */
export function CanvasZoomControls() {
  const { fitView, zoomIn, zoomOut, zoomTo } = useReactFlow();
  const zoom = useStore(paintedZoom);

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
      {zoomStep('Zoom out', 'minus', pressing(zoomOut))}
      <button
        aria-label="Reset zoom"
        className={readout}
        onClick={pressing(async () => zoomTo(1))}
        type="button"
      >
        {zoom}
      </button>
      {zoomStep('Zoom in', 'plus', pressing(zoomIn))}
      {zoomStep('Zoom to fit', 'fit', pressing(fitView))}
    </Controls>
  );
}
