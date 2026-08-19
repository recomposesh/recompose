import type { ReactNode } from 'react';

import { Handle, Position } from '@xyflow/react';

import type { CanvasNode } from '../../lib/node-graph';

import { Icon, StatusChip } from '../../../../shared/ui';

/** What a judge satellite reads itself off, which is the judge the router's policy names. */
export type JudgeSatelliteData = Extract<CanvasNode, { kind: 'judge' }>;

type JudgeSatelliteProps = {
  /** What the node reads itself off, which the graph derived from the router it advises. */
  data: JudgeSatelliteData;
  /** Whether the node stands selected, which is what rings it and puts the inspector on it. */
  selected: boolean;
};

const silhouette =
  'flex size-11 items-center justify-center rounded-pill border border-router bg-surface-card text-router shadow-raised focus-ring aria-pressed:bg-router/12 aria-pressed:ring-2 aria-pressed:ring-router/40';

const anchor = 'top-1/2 z-1 flex size-hit-target items-center justify-center bg-transparent';

/**
 * What the caption under the silhouette says, which is what the judge answers with right now.
 *
 * @summary A judge standing out of a cooldown says so in a word rather than counting seconds down:
 * a number ticking on the canvas would pull the eye off the composition every second, and the
 * window that remains is a thing a person reads once, in the inspector. Every other moment the
 * caption spends itself on the model the judge classifies with, which is what tells two apart.
 */
function caption(data: JudgeSatelliteData): ReactNode {
  if (data.standing === 'cooling') {
    return <StatusChip tone="attention" word="Cooling" />;
  }

  return (
    <span
      className="max-w-full truncate font-mono text-mono-caption text-ink-secondary"
      title={data.providerModel}
    >
      {data.providerModel}
    </span>
  );
}

/**
 * The judge advising one conditional router, standing above it as a small round node.
 *
 * @summary Reach for it as the canvas node for a router's judge. Round says advisor where every
 * other card on this canvas is a rectangle or a chamfer, so nobody reads it as one more target a
 * request could land on, and the router's own tint says which router it belongs to. The mark stays
 * a single stroke, because anything finer is mud at the zoom a whole composition fits in, and the
 * model it judges with prints under the silhouette rather than inside it. The tie arrives on the
 * side facing the router below, so the line never crosses the cables running to the children.
 */
export function JudgeSatellite({ data, selected }: JudgeSatelliteProps) {
  return (
    <div className="flex w-24 flex-col items-center gap-1 node-tint-router">
      <span className="relative flex">
        <Handle className={anchor} isConnectable={false} position={Position.Right} type="target">
          <span aria-hidden className="port-dot" data-bound />
        </Handle>
        <button aria-pressed={selected} className={silhouette} type="button">
          <span className="sr-only">Judge</span>
          <Icon className="size-4" name="search" />
        </button>
      </span>
      {caption(data)}
    </div>
  );
}
