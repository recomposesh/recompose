import type { CanvasNode } from '../../lib/node-graph';

import { NodeCard } from '../node-card/node-card';

/** What a gateway card reads itself off, which is the gateway plus the one ask it carries. */
export type GatewayNodeData = Extract<CanvasNode, { kind: 'gateway' }> & {
  /** Receives the ask for a virtual model this gateway does not serve yet. */
  onAddVirtualModel: () => void;
};

type GatewayNodeProps = {
  /** What the card reads itself off, which is the node the graph derived for the gateway. */
  data: GatewayNodeData;
  /** Whether the card stands selected, which is what rings it and puts the inspector on it. */
  selected: boolean;
};

/**
 * The gateway itself, standing at the head of everything it serves.
 *
 * @summary Reach for it as the canvas card for the gateway column. It names the port a client
 * points at, so nobody opens the inspector to read it, and nothing arrives at it, because a request
 * starts here. Its plus hangs off the outgoing port on a short wire, so even a gateway serving
 * nothing shows where a virtual model would go.
 */
export function GatewayNode({ data, selected }: GatewayNodeProps) {
  const { displayName, port, onAddVirtualModel } = data;

  return (
    <NodeCard
      chipGlyph="network"
      chipMark={undefined}
      chipTint="text-gateway"
      frame=""
      incoming={false}
      kicker="Gateway"
      name={displayName}
      nameInk="text-ink"
      outgoing={{ bound: true, ask: 'Add a virtual model', onAsk: onAddVirtualModel }}
      selected={selected}
      subtitle={`:${port}`}
      subtitleInk="text-ink-secondary"
      tint="node-tint-gateway"
    />
  );
}
