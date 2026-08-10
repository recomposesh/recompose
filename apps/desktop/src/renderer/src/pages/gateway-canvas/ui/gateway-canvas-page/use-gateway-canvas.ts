import type { Account, GatewayConfig } from '@recompose/contracts';
import type { ReactFlowInstance } from '@xyflow/react';

import { useQuery } from '@tanstack/react-query';
import { useRef, useSyncExternalStore } from 'react';

import type { BindingOutcome } from '../../lib/cable-announcements';
import type { XY } from '../../lib/canvas-positions';
import type { ModelListReading, SettledDefinition } from '../../lib/model-draft';
import type { PickerStage } from '../drop-picker/drop-picker';
import type { InspectorSubject } from '../gateway-drawer/gateway-drawer';
import type { CanvasFlowWiring } from '../gateway-stage/gateway-stage';
import type { OptionGroup } from '../option-list/option-list';
import type { CanvasWorld, DragWatch, PickerStanding } from './canvas-standings';

import { engineTrafficQueryOptions, useDefineVirtualModel } from '../../../../shared/api';
import { canvasPositions, subscribeToCanvasPositions } from '../../lib/canvas-position-store';
import { emptyDefinition } from '../../lib/model-draft';
import { canvasGraph } from '../../lib/node-graph';
import { targetGroups } from '../../lib/target-groups';
import { heldDraft, leaveDrafting, useHeldDraft } from '../../lib/use-held-draft';
import {
  completedDraftPick,
  completedRebindPick,
  removedDefinition,
  spokenNameOf,
  targetNameIn,
} from './binding-acts';
import { flowWiring } from './canvas-gestures';
import {
  overlayOf,
  seatsOf,
  useCanvasStandings,
  useEscapeCancelledDrag,
  usePickerModels,
} from './canvas-standings';
import { modelIdOf, subjectOf } from './canvas-wiring';

/** The picker as the page anchors it onto the canvas, ready to stand on the card it names. */
export type PickerOnCanvas = {
  stage: PickerStage;
  groups: readonly OptionGroup[];
  refusal: string | undefined;
  anchorSeat: XY;
  onPickAccount: (accountId: string) => void;
  onPickProviderModel: (providerModel: string) => void;
  onDismiss: () => void;
};

/** The removal a Delete press asked for, standing until the person answers. */
export type RemovalAsked = { name: string; onConfirm: () => void; onCancel: () => void };

/** Everything the page renders the canvas from, wired in one place. */
export type ComposedCanvas = {
  flow: CanvasFlowWiring;
  announced: BindingOutcome | undefined;
  subject: InspectorSubject;
  refusal: string | undefined;
  picker: PickerOnCanvas | undefined;
  removal: RemovalAsked | undefined;
  onDraftDefined: (definition: SettledDefinition) => void;
  /**
   * Selects a card by its node id, or clears the selection where nothing is named.
   *
   * @summary The canvas is not the only surface that says what a person means: the logs drawer's
   * scope strip names the same cards, and pressing one there has to move the one selection rather
   * than growing a second copy of it.
   */
  onSelectSubject: (nodeId: string | undefined) => void;
};

function pickerGroups(
  world: CanvasWorld,
  picker: PickerStanding,
  offered: readonly string[],
): readonly OptionGroup[] {
  return picker.step === 'account'
    ? targetGroups([...world.accounts])
    : [{ options: offered.map((id) => ({ id, name: id })) }];
}

function completedPick(
  world: CanvasWorld,
  from: string,
  accountId: string,
  providerModel: string,
): void {
  if (from === 'draft') {
    completedDraftPick(world, accountId, providerModel);
  } else {
    completedRebindPick(world, accountId, providerModel);
  }
}

function pickerStage(picker: PickerStanding): PickerStage {
  return picker.step === 'account'
    ? { step: 'account' }
    : { step: 'provider-model', accountId: picker.accountId };
}

function pickerOnCanvas(world: CanvasWorld, models: ModelListReading): PickerOnCanvas | undefined {
  const picker = world.standings.picker;

  if (picker === undefined) {
    return undefined;
  }

  const anchorId = 'at' in picker ? 'pending' : picker.anchor;

  return {
    stage: pickerStage(picker),
    groups: pickerGroups(world, picker, models.offered),
    refusal: picker.step === 'provider-model' ? models.refusal : undefined,
    anchorSeat: world.seats[anchorId] ?? { x: 0, y: 0 },
    onPickAccount: (accountId) => {
      if (picker.step === 'account') {
        world.standings.setPicker({
          step: 'provider-model',
          from: picker.from,
          accountId,
          at: picker.at,
          origin: picker.origin,
        });
      }
    },
    onPickProviderModel: (providerModel) => {
      if (picker.step === 'provider-model') {
        completedPick(world, picker.from, picker.accountId, providerModel);
      }
    },
    onDismiss: () => {
      world.standings.setPicker(undefined);
    },
  };
}

function draftRemovalName(world: CanvasWorld): string {
  return spokenNameOf(heldDraft(world.slug)?.definition ?? emptyDefinition());
}

function removalName(world: CanvasWorld, nodeId: string): string {
  if (nodeId === 'draft') {
    return draftRemovalName(world);
  }

  const model = world.gateway.virtualModels.find((held) => held.id === modelIdOf(nodeId));

  return model?.displayName ?? nodeId;
}

function removalAsked(world: CanvasWorld): RemovalAsked | undefined {
  const nodeId = world.standings.removing;

  if (nodeId === undefined) {
    return undefined;
  }

  return {
    name: removalName(world, nodeId),
    onConfirm: () => {
      removedDefinition(world, nodeId);
      world.standings.setRemoving(undefined);
    },
    onCancel: () => {
      world.standings.setRemoving(undefined);
    },
  };
}

/**
 * Everything the gateway canvas is made of, composed from engine truth and the renderer overlay.
 *
 * @summary The graph derives afresh on every render and the flow only ever hands gestures back,
 * so what a person sees is the stored composition rather than a copy drifting beside one. Every
 * gesture that changes the composition travels through the one stored-gateway write, and every
 * outcome comes back as a sentence for the live region. With no gateway under the slug there is
 * nothing to compose, which the page turns into its not-found answer.
 */
export function useGatewayCanvas(
  slug: string,
  gateway: GatewayConfig | undefined,
  accounts: readonly Account[],
): ComposedCanvas | undefined {
  const standings = useCanvasStandings();
  const stored = useSyncExternalStore(subscribeToCanvasPositions, () => canvasPositions(slug));
  const draft = useHeldDraft(slug);
  const define = useDefineVirtualModel();
  const pickerModels = usePickerModels(standings.picker);
  const { data: traffic } = useQuery(engineTrafficQueryOptions);
  const dragging = useRef<DragWatch>({ inFlight: false, escaped: false });
  const view = useRef<ReactFlowInstance | null>(null);

  useEscapeCancelledDrag(dragging);

  if (gateway === undefined) {
    return undefined;
  }

  const overlay = overlayOf(draft, standings.picker);
  const graph = canvasGraph(gateway, accounts, overlay, traffic);
  const seats = seatsOf(graph, stored, overlay);
  const world: CanvasWorld = {
    slug,
    gateway,
    accounts,
    standings,
    graph,
    seats,
    define,
    dragging,
    view,
  };

  return {
    flow: flowWiring(world),
    announced: standings.announced,
    subject: subjectOf(standings.selection),
    refusal: standings.refusal,
    picker: pickerOnCanvas(world, pickerModels),
    removal: removalAsked(world),
    onSelectSubject: standings.select,
    onDraftDefined: (definition) => {
      leaveDrafting(slug);
      standings.select(`model:${definition.id}`);
      standings.announce({
        kind: 'bound',
        virtualModel: spokenNameOf(definition),
        target: targetNameIn(accounts, definition.accountId),
      });
    },
  };
}
