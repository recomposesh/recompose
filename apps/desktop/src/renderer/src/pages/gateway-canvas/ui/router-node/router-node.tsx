import type { ReactNode } from 'react';

import { nameOfRouter } from '@recompose/contracts';
import { Handle, Position } from '@xyflow/react';

import type { CanvasNode } from '../../lib/node-graph';

import { JUDGE_SHOULDER_PORT } from '../../lib/canvas-cables';
import { NodeCard } from '../node-card/node-card';
import { childTally } from './router-reading';

/** What a router card reads itself off, the stored router plus the one ask it carries. */
export type RouterNodeData = Extract<CanvasNode, { kind: 'router' }> & {
  /** Receives the ask to bind this router its next child, which is the same ask a drop opens. */
  onAddChild: () => void;
};

type RouterNodeProps = {
  /** What the card reads itself off, which is the node the graph derived for this route node. */
  data: RouterNodeData;
  /** Whether the card stands selected, which is what rings it and puts the inspector on it. */
  selected: boolean;
};

/**
 * Where a request spreads across several targets, drawn as the one node that is not a rectangle.
 *
 * @summary Reach for it as the canvas card for a route node holding children. The chamfered frame
 * says at a glance that this is not a thing a person stored, and its points are where the cables
 * meet, so a ladder reads as one line rather than as cards abutting flat sides. The card spends
 * its two lines on two facts: a router a person named keeps the mode on the mono line, and one
 * wearing its derived name carries the child count there instead, so no card prints one word twice.
 * A router holding no child dashes the way a removed target does, because the canvas says
 * incomplete at compose time rather than waiting for a request to refuse.
 */
/**
 * The port the judge's tie leaves a conditional router by, which is its shoulder.
 *
 * @summary It answers no drag at all: a judge is bound in the inspector rather than pulled out of
 * the card, and a port that started a cable here would let a person ladder a child off the very
 * anchor that says advisor.
 */
function shoulderPort(): ReactNode {
  return (
    <Handle
      className="z-1 flex size-hit-target items-center justify-center bg-transparent"
      id={JUDGE_SHOULDER_PORT}
      isConnectable={false}
      isConnectableStart={false}
      position={Position.Top}
      type="source"
    >
      <span aria-hidden className="port-dot" data-bound />
    </Handle>
  );
}

export function RouterNode({ data, selected }: RouterNodeProps) {
  const { mode, displayName, childCount, onAddChild } = data;
  const incomplete = childCount === 0;

  return (
    <>
      <NodeCard
        chipGlyph="branch"
        chipMark={undefined}
        chipTint="text-router"
        frame={incomplete ? 'node-card-drafted' : ''}
        incoming
        kicker="Router"
        kickerTint="text-router-ink"
        name={nameOfRouter(mode, displayName)}
        nameInk="text-ink"
        outgoing={{ bound: !incomplete, ask: 'Add a child', onAsk: onAddChild }}
        selected={selected}
        shape="chamfered"
        subtitle={displayName === undefined ? childTally(childCount) : mode}
        subtitleInk="text-ink-secondary"
        tint="node-tint-router"
      />
      {mode === 'conditional' ? shoulderPort() : null}
    </>
  );
}
