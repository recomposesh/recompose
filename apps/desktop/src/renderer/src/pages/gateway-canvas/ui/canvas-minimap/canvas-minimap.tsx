import type { Node } from '@xyflow/react';

import { MiniMap } from '@xyflow/react';

import type { CanvasNodeKind } from '../../lib/node-graph';

const roleFills: Record<string, string> = {
  gateway: 'minimap-node node-tint-gateway',
  'virtual-model': 'minimap-node node-tint-virtual-model',
  target: 'minimap-node node-tint-target',
  'draft-model': 'minimap-node-dim node-tint-virtual-model',
  'ghost-target': 'minimap-node-dim node-tint-target',
  'pending-target': 'minimap-node-dim node-tint-target',
} satisfies Record<CanvasNodeKind, string>;

const mapCard = { width: 172, height: 112 };

function fillFor({ type }: Node): string {
  return roleFills[type ?? ''] ?? 'minimap-node';
}

/**
 * The map card in the canvas corner, drawing the whole composition at a glance.
 *
 * @summary Reach for it wherever the canvas stands, since a composition wider than the pane leaves
 * a person with nothing to place themselves by. Every card draws in the tint its role already
 * carries on the canvas, one that is not real yet reads dimmed, and the wash marks what the
 * viewport left behind. Dragging the map moves the viewport it pictures, and a scroll over it
 * zooms, so the corner is a handle on the composition rather than only a picture of it.
 */
export function CanvasMinimap() {
  return (
    <MiniMap
      ariaLabel="Canvas map"
      className="m-4 rounded-canvas-card border border-line-subtle bg-canvas-card shadow-canvas-card"
      maskColor="var(--color-minimap-mask)"
      nodeClassName={fillFor}
      pannable
      position="bottom-right"
      style={mapCard}
      zoomable
    />
  );
}
