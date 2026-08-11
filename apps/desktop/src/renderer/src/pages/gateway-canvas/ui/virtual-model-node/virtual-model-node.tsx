import type { CanvasNode } from '../../lib/node-graph';

import { NodeCard } from '../node-card/node-card';

/** What a virtual model card reads itself off, the definition plus the one ask it carries. */
export type VirtualModelNodeData = Extract<CanvasNode, { kind: 'virtual-model' }> & {
  /** Receives the ask to put a different target behind this definition. */
  onPickTarget: () => void;
};

type VirtualModelNodeProps = {
  /** What the card reads itself off, which is the node the graph derived for this definition. */
  data: VirtualModelNodeData;
  /** Whether the card stands selected, which is what rings it and puts the inspector on it. */
  selected: boolean;
};

/**
 * One alias the gateway answers to, standing between the gateway and whatever serves it.
 *
 * @summary Reach for it as the canvas card for the middle column. The line under the name is the id
 * a client actually sends, because that is the string a person copies out of this screen, and the
 * plus beside the outgoing port opens the target picker, which is the path that needs no dragging.
 */
export function VirtualModelNode({ data, selected }: VirtualModelNodeProps) {
  const { displayName, modelId, onPickTarget } = data;

  return (
    <NodeCard
      chipGlyph="spark"
      chipMark={undefined}
      chipTint="text-virtual-model"
      frame=""
      incoming
      kicker="Virtual model"
      kickerTint="text-virtual-model-ink"
      name={displayName}
      nameInk="text-ink"
      outgoing={{ bound: true, offersCable: false, ask: 'Choose a target', onAsk: onPickTarget }}
      selected={selected}
      subtitle={modelId}
      subtitleInk="text-ink-secondary"
      tint="node-tint-virtual-model"
    />
  );
}
