import type { ReactNode } from 'react';

import { CHAMFERED_CARD, NodeChamfer } from '../../../../shared/ui';

/** One card in the teaching diagram, named for the part of the graph it stands for. */
type SetupNodeKind = 'gateway' | 'virtual-model' | 'router' | 'subscription' | 'local-runtime';

const TINT: Record<SetupNodeKind, string> = {
  gateway: 'node-tint-gateway',
  'virtual-model': 'node-tint-virtual-model',
  router: 'node-tint-router',
  subscription: 'node-tint-subscription',
  'local-runtime': 'node-tint-local',
};

const KICKER: Record<SetupNodeKind, string> = {
  gateway: 'Gateway',
  'virtual-model': 'Virtual model',
  router: 'Router',
  subscription: 'Subscription',
  'local-runtime': 'Local runtime',
};

/**
 * @summary An id or a port is a string a person copies, so it sets in mono where every character
 * counts. A line saying whose turn a target takes is prose, and prose set in mono reads as a
 * value someone could type back in.
 */
const UNDER_SET: Record<SetupNodeKind, string> = {
  gateway: 'font-mono text-mono-caption',
  'virtual-model': 'font-mono text-mono-caption',
  router: 'font-mono text-mono-caption',
  subscription: 'text-caption',
  'local-runtime': 'text-caption',
};

const KICKER_INK: Record<SetupNodeKind, string> = {
  gateway: 'text-gateway-ink',
  'virtual-model': 'text-virtual-model-ink',
  router: 'text-router-ink',
  subscription: 'text-subscription-ink',
  'local-runtime': 'text-local-ink',
};

type SetupNodeProps = {
  /** Which part of the graph this card stands for. */
  kind: SetupNodeKind;
  /** The name the card leads with. */
  name: string;
  /** The line under the name, which is the id a client sends or the standing the card carries. */
  under: string;
  /** A drawing at the head of the kicker row, where the card has a mark to lead with. */
  lead?: ReactNode;
};

/**
 * One card of the diagram setup teaches the graph with.
 *
 * @summary It draws the canvas card rather than mounting one. The canvas card is a React Flow
 * node: it carries handles that only resolve inside a flow, so standing one on a wizard step
 * would mean mounting a whole canvas to explain a canvas. The two share their tints, their
 * chamfer, and their card chrome through the token layer, which is where a drift would show.
 */
/**
 * @summary A chamfer takes its edges in toward the middle of every line of text, so the rounded
 * card's inset would run the kicker straight into the inner keyline. The wider inset is the price
 * of the shape rather than a second opinion about the card's measure.
 */
const INSET: Record<'rounded' | 'chamfered', string> = {
  rounded: 'px-3',
  chamfered: CHAMFERED_CARD,
};

export function SetupNode({ kind, name, under, lead }: SetupNodeProps) {
  const chamfered = kind === 'router';

  return (
    <div
      className={`relative flex h-22 w-46 flex-col justify-center gap-0.5 node-card ${TINT[kind]} ${
        INSET[chamfered ? 'chamfered' : 'rounded']
      }`}
      data-setup-node={kind}
    >
      {chamfered ? <NodeChamfer /> : null}
      <span className="relative flex items-center gap-1">
        {lead}
        <span className={`text-footnote font-bold tracking-wider uppercase ${KICKER_INK[kind]}`}>
          {KICKER[kind]}
        </span>
      </span>
      <span className="relative truncate text-card-title text-ink">{name}</span>
      <span className={`relative truncate text-ink-secondary ${UNDER_SET[kind]}`}>{under}</span>
    </div>
  );
}
