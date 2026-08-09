import type { Account, GatewayConfig } from '@recompose/contracts';
import type { RefObject } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { BindingOutcome } from '../../lib/cable-announcements';
import type { NodePositions, XY } from '../../lib/canvas-positions';
import type { CanvasGraph, CanvasOverlay } from '../../lib/node-graph';
import type { HeldDraft } from '../../lib/use-held-draft';

import { providerModelsQueryOptions, useDefineVirtualModel } from '../../../../shared/api';
import { heldOver } from '../../lib/canvas-positions';
import { modelListReading, refusalFromMain } from '../../lib/model-draft';
import { tidyPositions } from '../../lib/tidy-layout';

/** Where the two-stage picker stands: on a pending card, or anchored to a stored target. */
export type PickerStanding =
  | { step: 'account'; from: string; at: XY }
  | { step: 'provider-model'; from: string; accountId: string; at: XY }
  | { step: 'provider-model'; from: string; accountId: string; anchor: string };

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
};

/**
 * The renderer-held standings of the canvas: selection, the picker, a removal, and what to say.
 *
 * @summary These five are what the canvas holds beyond engine truth, so they live in one place
 * and every gesture moves them through named acts. A refusal lands twice on purpose: once in the
 * live region as an interruption, and once beside the inspector where the person reads why.
 */
export function useCanvasStandings(): CanvasStandings {
  const [selection, setSelection] = useState<string | undefined>(undefined);
  const [picker, setPicker] = useState<PickerStanding | undefined>(undefined);
  const [removing, setRemoving] = useState<string | undefined>(undefined);
  const [announced, setAnnounced] = useState<BindingOutcome | undefined>(undefined);
  const [refusal, setRefusal] = useState<string | undefined>(undefined);

  return {
    selection,
    picker,
    removing,
    announced,
    refusal,
    select: (subject) => {
      setSelection(subject);
      setRefusal(undefined);
    },
    setPicker,
    movePendingTo: (at) => {
      setPicker((held) => (held !== undefined && 'at' in held ? { ...held, at } : held));
    },
    setRemoving,
    announce: setAnnounced,
    refuse: (failure) => {
      const sentence = refusalFromMain(failure);

      setAnnounced({ kind: 'refused', refusal: sentence });
      setRefusal(sentence);
    },
  };
}

/** The model ids the picker's second stage offers, read live from the picked account. */
export function usePickerModels(picker: PickerStanding | undefined): readonly string[] {
  const accountId = picker?.step === 'provider-model' ? picker.accountId : '';
  const look = useQuery({
    ...providerModelsQueryOptions(accountId),
    enabled: accountId !== '',
  });

  return modelListReading(look.data).offered;
}

/**
 * Throws away a cable drag the moment Esc asks, before anything lands.
 *
 * @summary The library holds no cancel of its own, so Esc lets the pointer go for the person and
 * marks the drag escaped, which is what stops the release from opening a picker at wherever the
 * cable happened to hang.
 */
export function useEscapeCancelledDrag(dragging: RefObject<DragWatch>): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || !dragging.current.inFlight) {
        return;
      }

      dragging.current.escaped = true;
      document.dispatchEvent(new MouseEvent('mouseup'));
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [dragging]);
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
 * because a draft and a pending card were each placed by the gesture that made them.
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

  return heldOver(tidyPositions(graph.nodes), held);
}
