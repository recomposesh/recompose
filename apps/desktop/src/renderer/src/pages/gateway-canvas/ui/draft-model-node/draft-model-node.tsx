import type { CanvasNode } from '../../lib/node-graph';

import { NodeCard } from '../node-card/node-card';

/** What a draft card reads itself off, the unfinished definition plus the one ask it carries. */
export type DraftModelNodeData = Extract<CanvasNode, { kind: 'draft-model' }> & {
  /** Receives the ask to put a target behind the draft, which is what finishes it. */
  onPickTarget: () => void;
};

type DraftModelNodeProps = {
  /** What the card reads itself off, which is the node the graph derived for the held draft. */
  data: DraftModelNodeData;
  /** Whether the card stands selected, which is what rings it and puts the inspector on it. */
  selected: boolean;
};

/**
 * A definition a person began and has not finished, holding its seat until something answers it.
 *
 * @summary Reach for it as the canvas card for a virtual model with no target behind it yet, which
 * is where an unbind leaves one as readily as where the gateway's plus starts one. The dashed frame
 * and the quieter ink say unfinished without dimming the card, so every line stays as readable as a
 * finished one, and a draft with nothing typed into it still names itself rather than standing blank.
 */
export function DraftModelNode({ data, selected }: DraftModelNodeProps) {
  const { displayName, modelId, onPickTarget } = data;

  return (
    <NodeCard
      chipGlyph="spark"
      chipMark={undefined}
      chipTint="text-ink-secondary"
      frame="border-line-strong border-dashed"
      incoming
      kicker="Draft"
      kickerTint="text-ink-secondary"
      name={displayName === '' ? 'Unnamed virtual model' : displayName}
      nameInk="text-ink-secondary"
      outgoing={{ bound: false, ask: 'Choose a target', onAsk: onPickTarget }}
      selected={selected}
      subtitle={modelId === '' ? 'no id yet' : modelId}
      subtitleInk="text-ink-secondary"
      tint="node-tint-virtual-model"
    />
  );
}
