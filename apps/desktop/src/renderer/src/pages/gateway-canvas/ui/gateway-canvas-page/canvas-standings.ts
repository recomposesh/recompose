import type { Account, GatewayConfig } from '@recompose/contracts';
import type { ReactFlowInstance } from '@xyflow/react';
import type { RefObject } from 'react';

import type { useDefineVirtualModel } from '../../../../shared/api';
import type { BindingOutcome } from '../../lib/cable-announcements';
import type { NodePositions, XY } from '../../lib/canvas-positions';
import type { CanvasGraph, CanvasOverlay } from '../../lib/node-graph';
import type { HeldDraft } from '../../lib/use-held-draft';

import { heldOver } from '../../lib/canvas-positions';
import { refusalFromMain } from '../../lib/model-draft';
import { satellitesFollowTheirRouters, tidyPositions } from '../../lib/tidy-layout';

/**
 * A binding ask hanging off a card that already stands, which is where a cable was let go.
 *
 * @summary A cable let go on a stored target either binds one more thing or moves the binding a
 * cable already stood for, and only the gesture that opened the ask knows which. Carrying the
 * route node the drop replaces is what lets the pick write in that node's place: an ask that
 * forgot it would append where a person meant to move, and grow the ladder they were rearranging.
 */
type AnchoredAsk = {
  from: string;
  anchor: string;
  replacing?: string | undefined;
};

/** Where the binding ask stands: on a pending card, or anchored to a stored target. */
export type PickerStanding =
  | { step: 'kind'; from: string; at: XY; origin: PickerOrigin }
  | { step: 'account'; from: string; at: XY; origin: PickerOrigin }
  | ({ step: 'account' } & AnchoredAsk)
  | { step: 'provider-model'; from: string; accountId: string; at: XY; origin: PickerOrigin }
  | ({ step: 'provider-model'; accountId: string } & AnchoredAsk);

/** What opened the picker: a cable let go by hand, or an ask answered with the keyboard. */
type PickerOrigin = 'drop' | 'ask';

/** Whether a cable drag is in flight, and whether Esc already threw it away. */
export type DragWatch = { inFlight: boolean; escaped: boolean };

/** Every renderer-held standing on the canvas, with the acts that move each one. */
export type CanvasStandings = {
  selection: string | undefined;
  picker: PickerStanding | undefined;
  removing: string | undefined;
  announced: BindingOutcome | undefined;
  refusal: string | undefined;
  select: (subject: string | undefined) => void;
  setPicker: (standing: PickerStanding | undefined) => void;
  movePendingTo: (at: XY) => void;
  setRemoving: (nodeId: string | undefined) => void;
  announce: (outcome: BindingOutcome) => void;
  refuse: (failure: unknown) => void;
};

/** Everything a canvas gesture reads and writes, handed around as one world. */
export type CanvasWorld = {
  slug: string;
  gateway: GatewayConfig;
  accounts: readonly Account[];
  standings: CanvasStandings;
  graph: CanvasGraph;
  seats: NodePositions;
  define: ReturnType<typeof useDefineVirtualModel>;
  dragging: RefObject<DragWatch>;
  view: RefObject<ReactFlowInstance | null>;
};

/** What the five standings read as right now, which the acts answer beside. */
export type HeldStandings = Pick<
  CanvasStandings,
  'selection' | 'picker' | 'removing' | 'announced' | 'refusal'
>;

/**
 * Where each standing is written down, which a hook backs with state.
 *
 * @summary The pending card is moved through its own writer rather than written outright, because
 * a drag moves it many times a second and only the standing as it reads at that moment says
 * whether there is a card to move at all.
 */
export type StandingWriters = {
  writeSelection: (subject: string | undefined) => void;
  writePicker: (standing: PickerStanding | undefined) => void;
  movePicker: (moved: (was: PickerStanding | undefined) => PickerStanding | undefined) => void;
  writeRemoving: (nodeId: string | undefined) => void;
  writeAnnounced: (outcome: BindingOutcome) => void;
  writeRefusal: (sentence: string | undefined) => void;
};

/**
 * Moves the pending card a drag is carrying, and leaves an anchored ask exactly where it stands.
 *
 * @summary Only an ask holding its own point has a card to move: one anchored to a stored target
 * draws on that card, so a drag passing through would otherwise tear the ask off the thing it asks
 * about.
 */
export function pendingMovedTo(
  held: PickerStanding | undefined,
  at: XY,
): PickerStanding | undefined {
  return held !== undefined && 'at' in held ? { ...held, at } : held;
}

/**
 * The renderer-held standings of the canvas, each moved through a named act.
 *
 * @summary These five are what the canvas holds beyond engine truth, so they answer in one place
 * rather than wherever a gesture happens to reach. Choosing something new clears the refusal, since
 * a person who moved on is no longer reading why the last thing failed. A refusal lands twice on
 * purpose: once in the live region as an interruption, and once beside the inspector where the
 * person reads why.
 */
export function standingsOver(held: HeldStandings, writers: StandingWriters): CanvasStandings {
  return {
    ...held,
    select: (subject) => {
      writers.writeSelection(subject);
      writers.writeRefusal(undefined);
    },
    setPicker: writers.writePicker,
    movePendingTo: (at) => {
      writers.movePicker((was) => pendingMovedTo(was, at));
    },
    setRemoving: writers.writeRemoving,
    announce: writers.writeAnnounced,
    refuse: (failure) => {
      const sentence = refusalFromMain(failure);

      writers.writeAnnounced({ kind: 'refused', refusal: sentence });
      writers.writeRefusal(sentence);
    },
  };
}

/** The key that puts the most recent thing away, wherever the canvas is listening for it. */
export function isEscape(key: string): boolean {
  return key === 'Escape';
}

/**
 * Whether this key press throws away the cable drag in flight.
 *
 * @summary The library holds no cancel of its own, so Esc has to let the pointer go for the person,
 * and only while a cable is actually hanging: a press with nothing in flight belongs to whatever
 * else is listening.
 */
export function escapeThrowsTheDragAway(key: string, dragging: DragWatch): boolean {
  return isEscape(key) && dragging.inFlight;
}

/** What already answers Escape with a cancel of its own, so the canvas leaves it alone. */
export type EscapeHolders = { dragging: boolean; editing: boolean; dialogOpen: boolean };

/** What one Escape press settles on the canvas. */
export type EscapeSettling = 'canvas' | 'nobody';

/**
 * Lets Escape put the selection away, unless something nearer is already answering it.
 *
 * @summary A drag in flight, a text field mid-edit, and an open dialog each answer Escape with a
 * cancel of their own, so the canvas stands down rather than settling on top of them. The binding
 * ask is one of those dialogs: it dismisses itself and stops the press there, which is why putting
 * it away is never this decision's to make.
 */
export function escapeSettling(holders: EscapeHolders): EscapeSettling {
  return holders.dragging || holders.editing || holders.dialogOpen ? 'nobody' : 'canvas';
}

/** The account whose models the picker asks for, or none while it is asking something else. */
export function pickedAccountId(picker: PickerStanding | undefined): string {
  return picker?.step === 'provider-model' ? picker.accountId : '';
}

/** The two renderer standings the graph draws beside engine truth. */
export function overlayOf(
  draft: HeldDraft | undefined,
  picker: PickerStanding | undefined,
): CanvasOverlay {
  return {
    draft:
      draft === undefined
        ? undefined
        : {
            modelId: draft.definition.id,
            displayName: draft.definition.displayName,
            seat: draft.seat,
          },
    pending:
      picker !== undefined && 'at' in picker ? { from: picker.from, at: picker.at } : undefined,
  };
}

/**
 * Where every card stands: the person's arrangement and the overlay seats over the tidy ones.
 *
 * @summary The tidy arrangement decides which cards stand at all, the written arrangement moves
 * the ones a person dragged, and the overlay cards always sit exactly where their standing says,
 * because a draft and a pending card were each placed by the gesture that made them. A judge seats
 * last, off whichever seat its router actually took, so dragging a router carries its advisor
 * along instead of leaving the tie stretched across the canvas. Its own move is read from the
 * written arrangement rather than from the seats, because a satellite is remembered by the distance
 * a person left it at and the tidy arrangement it is laid over holds no such distance.
 */
export function seatsOf(
  graph: CanvasGraph,
  stored: NodePositions,
  overlay: CanvasOverlay,
): NodePositions {
  const held: Record<string, XY> = { ...stored };

  if (overlay.draft !== undefined) {
    held['draft'] = overlay.draft.seat;
  }

  if (overlay.pending !== undefined) {
    held['pending'] = overlay.pending.at;
  }

  return satellitesFollowTheirRouters(
    graph.nodes,
    heldOver(tidyPositions(graph.nodes), held),
    stored,
  );
}
