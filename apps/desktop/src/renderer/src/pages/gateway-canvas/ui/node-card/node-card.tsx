import type { ReactNode } from 'react';

import { Handle, Position, useConnection } from '@xyflow/react';

import type { IconName } from '../../../../shared/ui';

import { Icon } from '../../../../shared/ui';

/** The port a cable leaves a card by, and the ask a keyboard reaches it with. */
export type OutgoingPort = {
  /** Whether a cable already meets the port, which fills its dot. */
  bound: boolean;
  /** What the port offers without a drag, which is the name a keyboard reads off it. */
  ask: string;
  /** Receives that ask, which each kind of card answers in its own way. */
  onAsk: () => void;
};

/** Everything the template fixes about a canvas card, filled in by whichever card wears it. */
export type NodeCardProps = {
  /** The role tint class the frame, the selection ring, and the ports all draw from. */
  tint: string;
  /** Extra frame classes, which is where a dashed treatment rides. */
  frame: string;
  /** The ink class the seventeen-pixel chip and whatever it carries both take. */
  chipTint: string;
  /** The role's contrast-safe ink for the kicker, which the chip tint is too light to serve. */
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
  subtitle: string;
  /** The ink class that line takes. */
  subtitleInk: string;
  /** Whether the card stands selected, which is what rings it in its own tint. */
  selected: boolean;
  /** Whether a cable arrives at this card, which only the gateway says no to. */
  incoming: boolean;
  /** The outgoing port and its ask, or nothing where the flow ends at this card. */
  outgoing: OutgoingPort | undefined;
};

const portBox = 'top-port-offset flex size-hit-target items-center justify-center bg-transparent';

const keyboardAsk =
  'nodrag pointer-events-none absolute top-port-offset -inset-e-9 flex size-hit-target -translate-y-1/2 items-center justify-center rounded-pill border border-line-strong bg-surface-card text-ink opacity-0 focus-ring focus-visible:opacity-100';

const cardFrame =
  'flex size-full flex-col justify-center gap-0.5 node-card px-2.75 text-start focus-ring';

const kickerLine = 'truncate text-footnote font-bold tracking-wider uppercase';

function outgoingSide(port: OutgoingPort, dragging: boolean): ReactNode {
  const { bound, ask, onAsk } = port;

  return (
    <>
      <Handle className={portBox} position={Position.Right} type="source">
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
  const { tint, frame, chipTint, kickerTint, chipGlyph, chipMark, kicker, name, nameInk } = props;
  const { subtitle, subtitleInk, selected, incoming, outgoing } = props;

  return (
    <div className={`relative h-19.5 w-39.5 ${tint}`}>
      {incoming ? (
        <Handle className={portBox} position={Position.Left} type="target">
          <span aria-hidden className="port-dot" data-bound />
        </Handle>
      ) : null}
      <button aria-pressed={selected} className={`${cardFrame} ${frame}`} type="button">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={`flex size-4.25 items-center justify-center rounded-chip bg-current/12 ${chipTint}`}
          >
            {chipMark ?? <Icon className="size-2.75" name={chipGlyph} />}
          </span>
          <span className={`${kickerLine} ${kickerTint}`}>{kicker}</span>
        </span>
        <span className={`truncate text-card-title ${nameInk}`} title={name}>
          {name}
        </span>
        <span className={`truncate font-mono text-mono-caption ${subtitleInk}`}>{subtitle}</span>
      </button>
      {outgoing === undefined ? null : outgoingSide(outgoing, dragging)}
    </div>
  );
}
