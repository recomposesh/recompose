import type { ReactNode } from 'react';

import { Handle, Position, useConnection } from '@xyflow/react';

import type { IconName } from '../../../../shared/ui';

import { Icon } from '../../../../shared/ui';

/** The port a cable leaves a card by, and the ask a keyboard reaches it with. */
export type OutgoingPort = {
  /** Whether a cable already meets the port, which fills its dot. */
  bound: boolean;
  /** Whether a new cable can leave here; a port already spoken for answers no drag. */
  offersCable?: boolean;
  /** What the port offers without a drag, which is the name a keyboard reads off it. */
  ask: string;
  /** Receives that ask, which each kind of card answers in its own way. */
  onAsk: () => void;
};

/** Which outline a card's frame takes, since one node on this canvas is not a rectangle. */
export type NodeShape = 'rounded' | 'chamfered';

/** Everything the template fixes about a canvas card, filled in by whichever card wears it. */
export type NodeCardProps = {
  /** The role tint class the frame, the selection ring, and the ports all draw from. */
  tint: string;
  /** The outline the frame takes, which is the rounded rectangle unless a card says otherwise. */
  shape?: NodeShape;
  /** Extra frame classes, which is where a dashed treatment rides. */
  frame: string;
  /** The ink class the seventeen-pixel chip and whatever it carries both take. */
  chipTint: string;
  /** The frame's contrast-safe ink, which the kicker takes since the chip tint runs too light. */
  kickerTint: string;
  /** The glyph the chip leads with, which every card has one of. */
  chipGlyph: IconName;
  /** A vendor's own mark, drawn in the glyph's place wherever the vendor publishes one. */
  chipMark: ReactNode | undefined;
  /** The uppercase word above the name, saying which kind of card this is. */
  kicker: string;
  /** The name the card answers to, cut short with its own tooltip when it runs long. */
  name: string;
  /** The ink class the name takes, which quietens on a card nothing answers yet. */
  nameInk: string;
  /** The mono line under the name, which is the identifier or the standing. */
  subtitle?: string | undefined;
  /** The ink class that line takes. */
  subtitleInk: string;
  /** Whether the card stands selected, which is what rings it in its own tint. */
  selected: boolean;
  /** Whether a cable arrives at this card, which only the gateway says no to. */
  incoming: boolean;
  /** The outgoing port and its ask, or nothing where the flow ends at this card. */
  outgoing: OutgoingPort | undefined;
};

const portBox = 'top-1/2 flex size-hit-target items-center justify-center bg-transparent';

const keyboardAsk =
  'nodrag pointer-events-none absolute top-1/2 -inset-e-9 flex size-hit-target -translate-y-1/2 items-center justify-center rounded-pill border border-line-strong bg-surface-card text-ink opacity-0 focus-ring focus-visible:opacity-100';

const cardFrame =
  'relative flex size-full flex-col justify-center gap-0.5 node-card text-start outline-none';

const kickerLine = 'truncate text-footnote font-bold tracking-wider uppercase';

const CHAMFER_OUTER = 'M0.78 44 L12.57 0.75 L171.43 0.75 L183.22 44 L171.43 87.25 L12.57 87.25 Z';

const CHAMFER_INNER = 'M5.96 44 L16.39 5.75 L167.61 5.75 L178.04 44 L167.61 82.25 L16.39 82.25 Z';

/**
 * The chamfered outline a router wears in place of the rounded border.
 *
 * @operation The frame is drawn rather than bordered because a CSS border draws only the four
 * sides of a box, so a clipped card would lose its line along the two diagonals. Each path runs
 * half a stroke inside where its line belongs, the way a CSS border paints inside the box it
 * bounds, and the two run exactly five pixels apart along every edge. Both read the same fill,
 * line, and glow variables `node-card` settles, so one state table paints every card on this
 * canvas and the second line costs no second set of rules.
 */
function chamferedFrame(): ReactNode {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 size-full node-chamfer-frame"
      data-chamfer=""
      viewBox="0 0 184 88"
    >
      <path className="node-chamfer-fill" d={CHAMFER_OUTER} />
      <path className="node-chamfer-line" d={CHAMFER_INNER} />
    </svg>
  );
}

function outgoingSide(port: OutgoingPort, dragging: boolean): ReactNode {
  const { bound, offersCable = true, ask, onAsk } = port;

  return (
    <>
      <Handle
        className={portBox}
        isConnectable={offersCable}
        isConnectableStart={offersCable}
        position={Position.Right}
        type="source"
      >
        <span aria-hidden className="port-dot" data-bound={bound || undefined} />
      </Handle>
      {dragging ? null : (
        <button aria-label={ask} className={keyboardAsk} onClick={onAsk} type="button">
          <Icon className="size-3" name="plus" />
        </button>
      )}
    </>
  );
}

/**
 * What each shape adds to the shared frame: its outline, and the room its text needs inside it.
 *
 * @summary A chamfer takes its edges in toward the middle of every line of text, so the shipped
 * inset would run the kicker and the mono line straight into the inner border. The wider inset is
 * the price of the shape rather than a second opinion about the card's measure.
 */
const outlines: Record<NodeShape, string> = {
  rounded: 'px-2.75',
  chamfered: 'node-card-chamfer px-4.5',
};

function drawnFrame(shape: NodeShape): ReactNode {
  return shape === 'chamfered' ? chamferedFrame() : null;
}

function incomingSide(): ReactNode {
  return (
    <Handle className={portBox} position={Position.Left} type="target">
      <span aria-hidden className="port-dot" data-bound />
    </Handle>
  );
}

function cardFace(props: NodeCardProps): ReactNode {
  const { chipTint, kickerTint, chipGlyph, chipMark, kicker, name, nameInk } = props;
  const { subtitle, subtitleInk } = props;

  return (
    <>
      <span className="relative flex items-center gap-1.5">
        <span
          aria-hidden
          className={`flex size-4.25 items-center justify-center rounded-chip bg-current/12 ${chipTint}`}
        >
          {chipMark ?? <Icon className="size-2.75" name={chipGlyph} />}
        </span>
        <span className={`${kickerLine} ${kickerTint}`}>{kicker}</span>
      </span>
      <span className={`relative truncate text-card-title ${nameInk}`} title={name}>
        {name}
      </span>
      {subtitle === undefined ? null : (
        <span className={`relative truncate font-mono text-mono-caption ${subtitleInk}`}>
          {subtitle}
        </span>
      )}
    </>
  );
}

/**
 * The card every node on the canvas wears, from its frame down to its ports.
 *
 * @summary Reach for it from a node type rather than laying the template out again, because the
 * measure, the kicker row, the truncation, the port offsets, and the twenty-four pixel pointer
 * targets are one design and drift the moment they are written twice. The outgoing port carries a
 * keyboard ask that paints only under keyboard focus, so a pointer only ever meets the cable and
 * the canvas stays clear of icons the drag already covers. The ask steps aside while a cable is in
 * flight, since the drag already asks for the very thing it would.
 */
export function NodeCard(props: NodeCardProps) {
  const dragging = useConnection((connection) => connection.inProgress);
  const { tint, frame, shape = 'rounded', selected, incoming, outgoing } = props;

  return (
    <div className={`relative h-22 w-46 ${tint}`}>
      {incoming ? incomingSide() : null}
      <button
        aria-pressed={selected}
        className={`${cardFrame} ${outlines[shape]} ${frame}`}
        type="button"
      >
        {drawnFrame(shape)}
        {cardFace(props)}
      </button>
      {outgoing === undefined ? null : outgoingSide(outgoing, dragging)}
    </div>
  );
}
