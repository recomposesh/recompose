import { Handle, Position } from '@xyflow/react';

import type { CanvasNode } from '../../lib/node-graph';

import { Icon } from '../../../../shared/ui';

/** What a judge satellite reads itself off, which is the judge the router's policy names. */
export type JudgeSatelliteData = Extract<CanvasNode, { kind: 'judge' }>;

type JudgeSatelliteProps = {
  /** What the node reads itself off, which the graph derived from the router it advises. */
  data: JudgeSatelliteData;
  /** Whether the node stands selected, which is what rings it and puts the inspector on it. */
  selected: boolean;
};

const SILHOUETTE =
  'flex size-11 items-center justify-center rounded-pill bg-surface-card shadow-raised focus-ring aria-pressed:ring-2';

const RESTING =
  'border border-router text-router aria-pressed:bg-router/12 aria-pressed:ring-router/40';

const COOLING =
  'border border-attention text-attention-ink aria-pressed:bg-attention/12 aria-pressed:ring-attention/40';

const anchor = 'z-1 flex size-hit-target items-center justify-center bg-transparent';

/**
 * The outline the silhouette wears, which is the whole of what the canvas says about a judge.
 *
 * @summary A judge standing out of a cooldown says so by changing its own line rather than by
 * standing a word underneath: the word would put back the caption this node sheds and take the
 * room the dashed tie needs with it. The clock it is back by prints once in the inspector, which
 * is where a person goes when the outline is not enough, and both read the moment the engine
 * pushed, so neither can say a thing the other contradicts.
 */
function silhouette(data: JudgeSatelliteData): string {
  return `${SILHOUETTE} ${data.standing === 'cooling' ? COOLING : RESTING}`;
}

/**
 * The judge advising one conditional router, standing above it as a small round node.
 *
 * @summary Reach for it as the canvas node for a router's judge. Round says advisor where every
 * other card on this canvas is a rectangle or a chamfer, so nobody reads it as one more target a
 * request could land on, and the router's own tint says which router it belongs to. The mark stays
 * a single stroke, because anything finer is mud at the zoom a whole composition fits in, and it is
 * drawn large inside the circle rather than at the standing glyph size, since a brain shrunk to
 * sixteen pixels collapses into a disc with a line through it. The
 * model it judges with prints under the silhouette rather than inside it. The tie arrives on the
 * side facing the router below, so the line never crosses the cables running to the children.
 */
export function JudgeSatellite({ data, selected }: JudgeSatelliteProps) {
  return (
    <div className="flex w-24 flex-col items-center node-tint-router">
      <span className="relative flex">
        <Handle className={anchor} isConnectable={false} position={Position.Bottom} type="target">
          <span aria-hidden className="port-dot" data-bound />
        </Handle>
        <button aria-pressed={selected} className={silhouette(data)} type="button">
          <span className="sr-only">Judge</span>
          <Icon className="size-6" name="brain" />
        </button>
      </span>
    </div>
  );
}
