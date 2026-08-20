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
  /**
   * The uppercase word above the name, saying which kind of card this is.
   *
   * @summary It never truncates. Beside a badge it yields the row and reads to assistive tech
   * alone, because a kicker cut to its first syllable names nothing while the silhouette and the
   * badge between them already say what the word would have.
   */
  kicker: string;
  /**
   * A pill riding the end of the kicker row, where one card has a standing the kicker can't say.
   *
   * @summary It shares the kicker's row rather than taking a line, because the two lines under it
   * are the card's whole measure and a fourth line would push the mono line out of the frame. It
   * is also what takes the row's room from the kicker word, so the two never compete for it.
   */
  badge?: ReactNode;
  /** The name the card answers to, cut short with its own tooltip when it runs long. */
  name: string;
  /** The ink class the name takes, which quietens on a card nothing answers yet. */
  nameInk: string;
  /** The mono line under the name, which is the identifier or the standing. */
  subtitle?: string | undefined;
  /** The ink class that line takes. */
  subtitleInk: string;
  /**
   * Whether that line reads as a machine string or as prose, which decides its typeface.
   *
   * @summary A port, a model id and an address are strings a person copies into a client, so they
   * set in mono. An account identity is not: a card carrying both would print two mono lines a
   * reader cannot tell apart, and the typeface is what says which of the two they can send.
   */
  subtitleFace?: 'mono' | 'prose';
  /**
   * A second mono line under the subtitle, where one fact still tells two cards apart.
   *
   * @summary A card naming an account says who answers; it takes this to say what it answers with.
   * Two bindings on one account differ only here, so without it the canvas draws them identically.
   * It reads in the same ink as the subtitle and a different typeface, because quietening it
   * further is what drops a line of eleven-pixel text under the contrast a person can read.
   */
  footnote?: string | undefined;
  /** Whether the card stands selected, which is what rings it in its own tint. */
  selected: boolean;
  /** Whether a cable arrives at this card, which only the gateway says no to. */
  incoming: boolean;
  /**
   * Whether the cable a drag is carrying could land here, asked of the card it left.
   *
   * @summary Cards that take no cable leave it out and never light. The card asks rather than
   * being told, because whether a landing is offered changes with every drag and nothing outside
   * the flow re-renders when one begins.
   */
  takesCableFrom?: ((from: string) => boolean) | undefined;
  /** The outgoing port and its ask, or nothing where the flow ends at this card. */
  outgoing: OutgoingPort | undefined;
};

const subtitleFaces = {
  mono: 'font-mono text-mono-caption',
  prose: 'text-footnote',
} as const;

const portBox = 'top-1/2 z-1 flex size-hit-target items-center justify-center bg-transparent';

const keyboardAsk =
  'nodrag pointer-events-none absolute top-1/2 -inset-e-9 flex size-hit-target -translate-y-1/2 items-center justify-center rounded-pill border border-line-strong bg-surface-card text-ink opacity-0 focus-ring focus-visible:opacity-100';

const cardFrame =
  'relative flex size-full flex-col justify-center gap-0.5 node-card text-start outline-none';

const kickerLine = 'shrink-0 text-footnote font-bold tracking-wider uppercase';

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

/**
 * What the cable in flight means for this one card: whether one hangs, and whether it could land.
 *
 * @summary Both readings come off one subscription, because a card that lit while its own plus
 * still showed would offer two ways to bind the very thing the drag is already binding.
 */
function useCableInFlight(takesCableFrom: NodeCardProps['takesCableFrom']): {
  pulling: boolean;
  landing: boolean;
} {
  const pulledFrom = useConnection((connection) =>
    connection.inProgress ? connection.fromNode.id : undefined,
  );

  if (pulledFrom === undefined) {
    return { pulling: false, landing: false };
  }

  return { pulling: true, landing: takesCableFrom?.(pulledFrom) === true };
}

/**
 * The kicker word, painted where the row has room for it and read aloud where it has not.
 *
 * @summary A badge on the row is a second naming, so the word steps back to assistive tech rather
 * than truncating: a kicker cut to its first syllable names nothing a reader can use.
 */
function kickerWord(kicker: string, kickerTint: string, badge: ReactNode): ReactNode {
  return (
    <span className={badge === undefined ? `${kickerLine} ${kickerTint}` : 'sr-only'}>
      {kicker}
    </span>
  );
}

function cardFace(props: NodeCardProps): ReactNode {
  const { chipTint, kickerTint, chipGlyph, chipMark, kicker, badge, name, nameInk } = props;
  const { subtitle, subtitleInk, subtitleFace = 'mono', footnote } = props;

  return (
    <>
      <span className="relative flex min-w-0 items-center gap-1.5">
        <span
          aria-hidden
          className={`flex size-4.25 items-center justify-center rounded-chip bg-current/12 ${chipTint}`}
        >
          {chipMark ?? <Icon className="size-2.75" name={chipGlyph} />}
        </span>
        {kickerWord(kicker, kickerTint, badge)}
        {badge}
      </span>
      <span className={`relative truncate text-card-title ${nameInk}`} title={name}>
        {name}
      </span>
      {subtitle === undefined ? null : (
        <span className={`relative truncate ${subtitleFaces[subtitleFace]} ${subtitleInk}`}>
          {subtitle}
        </span>
      )}
      {footnote === undefined ? null : (
        <span
          className="relative truncate font-mono text-mono-caption text-ink-secondary"
          title={footnote}
        >
          {footnote}
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
 * flight, since the drag already asks for the very thing it would. Every card a cable in flight
 * could land on lights at once, so a person pulling one reads where it may go before they get
 * there rather than hunting for the one port that answers.
 */
export function NodeCard(props: NodeCardProps) {
  const cable = useCableInFlight(props.takesCableFrom);
  const { tint, frame, shape = 'rounded', selected, incoming, outgoing } = props;
  const { landing } = cable;

  return (
    <div className={`relative h-22 w-46 ${tint}`}>
      {incoming ? incomingSide() : null}
      <button
        aria-pressed={selected}
        className={`${cardFrame} ${outlines[shape]} ${frame}`}
        data-landing={landing || undefined}
        data-shape={shape}
        type="button"
      >
        {drawnFrame(shape)}
        {cardFace(props)}
      </button>
      {outgoing === undefined ? null : outgoingSide(outgoing, cable.pulling)}
    </div>
  );
}
