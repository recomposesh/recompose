import type { Node, ReactFlowState } from '@xyflow/react';
import type { ReactNode } from 'react';

import { MiniMap, useStore } from '@xyflow/react';
import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { AccountKind } from '../../../../entities/account';
import type { CanvasNodeKind } from '../../lib/node-graph';

import { accountKindNodeTint } from '../../lib/account-kind-paint';
import { drawnAsATie, TIE_DASH } from '../../lib/cable-standing';

const roleFills: Record<string, string> = {
  gateway: 'minimap-node node-tint-gateway',
  'virtual-model': 'minimap-node node-tint-virtual-model',
  router: 'minimap-node node-tint-router',
  judge: 'minimap-node node-tint-router',
  'draft-model': 'minimap-node-dim node-tint-virtual-model',
  'ghost-target': 'minimap-node-dim node-tint-danger',
  'pending-target': 'minimap-node-dim node-tint-ink-tertiary',
} satisfies Partial<Record<CanvasNodeKind, string>>;

const mapCard = { width: 172, height: 112 };

function isAccountKind(kind: unknown): kind is AccountKind {
  return typeof kind === 'string' && kind in accountKindNodeTint;
}

function accountKindOf(data: Node['data']): AccountKind | undefined {
  const account = data['account'];

  if (typeof account !== 'object' || account === null || !('kind' in account)) {
    return undefined;
  }

  const { kind } = account;

  return isAccountKind(kind) ? kind : undefined;
}

function fillFor({ data, type }: Node): string {
  if (type === 'target') {
    const kind = accountKindOf(data);

    return kind === undefined ? 'minimap-node' : `minimap-node ${accountKindNodeTint[kind]}`;
  }

  return roleFills[type ?? ''] ?? 'minimap-node';
}

type MapWire = { id: string; from: { x: number; y: number }; to: { x: number; y: number } };

function centreOf(state: ReactFlowState, nodeId: string): MapWire['from'] | undefined {
  const held = state.nodeLookup.get(nodeId);

  if (held === undefined) {
    return undefined;
  }

  return {
    x: held.internals.positionAbsolute.x + (held.measured.width ?? 0) / 2,
    y: held.internals.positionAbsolute.y + (held.measured.height ?? 0) / 2,
  };
}

function mapWiresOf(state: ReactFlowState): MapWire[] {
  const wires: MapWire[] = [];

  for (const edge of state.edges) {
    const from = centreOf(state, edge.source);
    const to = centreOf(state, edge.target);

    if (from !== undefined && to !== undefined) {
      wires.push({ id: edge.id, from, to });
    }
  }

  return wires;
}

function wirePaths(wires: MapWire[]): ReactNode {
  return (
    <g className="stroke-cable-resting" fill="none">
      {wires.map((wire) => (
        <path
          d={`M${String(wire.from.x)},${String(wire.from.y)} L${String(wire.to.x)},${String(wire.to.y)}`}
          key={wire.id}
          style={drawnAsATie(wire.id) ? { strokeDasharray: TIE_DASH } : undefined}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

/**
 * The map card in the canvas corner, drawing the whole composition at a glance.
 *
 * @summary Reach for it wherever the canvas stands, since a composition wider than the pane leaves
 * a person with nothing to place themselves by. Every card draws in the tint its role already
 * carries on the canvas, one that is not real yet reads dimmed, and the wash marks what the
 * viewport left behind. Target cards take the tint of their account kind rather than sharing one
 * generic target color. A judge draws in its router's tint on a tie that breaks into dashes, so
 * the map answers a glance with the same composition the canvas does rather than an orphan mark.
 * The map's own component draws nodes alone, so the cables portal into its svg in flow coordinates,
 * and their stroke refuses the viewBox scaling to stay one hairline at any zoom. Dragging the map
 * moves the viewport it pictures, and a scroll over it zooms.
 */
export function CanvasMinimap() {
  const wires = useStore(mapWiresOf);
  const [host, setHost] = useState<SVGSVGElement | null>(null);

  useLayoutEffect(() => {
    setHost(document.querySelector<SVGSVGElement>('.react-flow__minimap-svg'));
  }, []);

  return (
    <>
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
      {host !== null && createPortal(wirePaths(wires), host)}
    </>
  );
}
