import type { MenuAction } from '../../../../shared/ui';
import type { CanvasWorld } from './canvas-standings';

import { askedTargetRemoval } from './binding-acts';
import { revealOn } from './canvas-standings';

/** What a right-click landed on, read off the id the card or cable answers to. */
export type CanvasSubjectKind =
  | 'pane'
  | 'gateway'
  | 'draft'
  | 'pending'
  | 'virtual-model'
  | 'target'
  | 'router'
  | 'judge'
  | 'cable';

/** The acts a menu reaches that no single card owns, handed in by the page that wires them. */
export type CanvasMenuAsks = {
  onAddVirtualModel: () => void;
  onBindFrom: (from: string) => void;
  onTidy: () => void;
  onReleaseCable: (edgeId: string) => void;
};

const namedExactly: Record<string, CanvasSubjectKind> = {
  gateway: 'gateway',
  draft: 'draft',
  pending: 'pending',
};

const namedByPrefix: readonly (readonly [string, CanvasSubjectKind])[] = [
  ['cable:', 'cable'],
  ['model:', 'virtual-model'],
  ['target:', 'target'],
  ['ghost:', 'target'],
  ['route:', 'router'],
  ['judge:', 'judge'],
];

/**
 * What a right-click landed on, which the id already says.
 *
 * @summary The canvas names every card and cable by a prefix that says what it stands for, and the
 * Delete press already reads them that way. Reading the menu's subject off the same names keeps
 * one vocabulary rather than a second table of kinds that drifts from the ids themselves. Anything
 * unrecognized reads as the pane, so a card nobody taught this about still raises the canvas acts
 * instead of an empty menu.
 */
export function canvasSubjectKind(subject: string | undefined): CanvasSubjectKind {
  if (subject === undefined) {
    return 'pane';
  }

  return (
    namedExactly[subject] ??
    namedByPrefix.find(([prefix]) => subject.startsWith(prefix))?.[1] ??
    'pane'
  );
}

function shownInInspector(world: CanvasWorld, subject: string): MenuAction {
  return {
    label: 'Show in inspector',
    icon: 'panel-right',
    onSelect: () => {
      revealOn(world.standings, subject);
    },
  };
}

function tidied(asks: CanvasMenuAsks): MenuAction {
  return { label: 'Tidy the canvas', icon: 'tidy', onSelect: asks.onTidy };
}

function born(asks: CanvasMenuAsks): MenuAction {
  return { label: 'Add a virtual model', icon: 'plus', onSelect: asks.onAddVirtualModel };
}

function boundFrom(asks: CanvasMenuAsks, subject: string, label: string): MenuAction {
  return {
    label,
    icon: 'plus',
    onSelect: () => {
      asks.onBindFrom(subject);
    },
  };
}

function removed(label: string, act: () => void): MenuAction {
  return { label, icon: 'trash', tone: 'danger', onSelect: act };
}

function askedAbout(world: CanvasWorld, subject: string, label: string): MenuAction {
  return removed(label, () => {
    world.standings.setRemoving(subject);
  });
}

type ActsOnASubject = (world: CanvasWorld, subject: string, asks: CanvasMenuAsks) => MenuAction[];

const canvasActs = (asks: CanvasMenuAsks): MenuAction[] => [born(asks), tidied(asks)];

const actsOnA: Record<CanvasSubjectKind, ActsOnASubject> = {
  pane: (_world, _subject, asks) => canvasActs(asks),
  gateway: (world, subject, asks) => [
    born(asks),
    shownInInspector(world, subject),
    tidied(asks),
    askedAbout(world, subject, 'Delete gateway…'),
  ],
  'virtual-model': (world, subject, asks) => [
    boundFrom(asks, subject, 'Pick a target'),
    shownInInspector(world, subject),
    askedAbout(world, subject, 'Delete virtual model…'),
  ],
  router: (world, subject, asks) => [
    boundFrom(asks, subject, 'Add a provider'),
    shownInInspector(world, subject),
    askedAbout(world, subject, 'Delete router…'),
  ],
  target: (world, subject) => [
    shownInInspector(world, subject),
    removed('Remove provider…', () => {
      askedTargetRemoval(world, subject);
    }),
  ],
  draft: (world, subject) => [
    shownInInspector(world, subject),
    askedAbout(world, subject, 'Discard draft'),
  ],
  cable: (world, subject, asks) => [
    shownInInspector(world, subject),
    removed('Release binding…', () => {
      asks.onReleaseCable(subject);
    }),
  ],
  judge: (world, subject, asks) => [shownInInspector(world, subject), tidied(asks)],
  pending: (world, subject, asks) => [shownInInspector(world, subject), tidied(asks)],
};

/**
 * Every act one subject offers, which is the pair of ways into it plus the way out.
 *
 * @summary A menu carries only acts the canvas already answers, so nothing here is a capability of
 * its own: each one runs the same gesture a plus, a cable, or a Delete press runs. Every subject
 * ends with at least one act, because a right-click that opened an empty box reads as broken while
 * one that opened nothing reads as a surface with nothing to offer.
 */
export function canvasMenuActs(
  world: CanvasWorld,
  subject: string | undefined,
  asks: CanvasMenuAsks,
): MenuAction[] {
  if (subject === undefined) {
    return canvasActs(asks);
  }

  return actsOnA[canvasSubjectKind(subject)](world, subject, asks);
}
