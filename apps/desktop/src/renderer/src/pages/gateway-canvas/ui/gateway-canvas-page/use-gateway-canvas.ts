import type { Account, GatewayConfig } from '@recompose/contracts';
import type { ReactFlowInstance } from '@xyflow/react';

import { useQuery } from '@tanstack/react-query';
import { useRef, useSyncExternalStore } from 'react';

import type { BindingOutcome } from '../../lib/cable-announcements';
import type { ModelListReading, SettledDefinition } from '../../lib/model-draft';
import type { InspectorSubject } from '../gateway-drawer/gateway-drawer';
import type { CanvasFlowWiring } from '../gateway-stage/gateway-stage';
import type { CanvasWorld, DragWatch } from './canvas-standings';
import type { PickerOnCanvas } from './picker-on-canvas';
import type { RemovalAsked } from './removal-flow';

import {
  engineTrafficQueryOptions,
  subscriptionsQueryOptions,
  useDefineVirtualModel,
} from '../../../../shared/api';
import { closeInspector, useDisplayTick } from '../../../../shared/lib';
import {
  canvasPositions,
  keepCanvasPositions,
  setNodePosition,
  subscribeToCanvasPositions,
} from '../../lib/canvas-position-store';
import { canvasGraph } from '../../lib/node-graph';
import { targetSeatBeside } from '../../lib/tidy-layout';
import { heldDraft, leaveDrafting, useHeldDraft } from '../../lib/use-held-draft';
import { askedTargetRemoval, spokenNameOf, targetNameIn } from './binding-acts';
import { flowWiring } from './canvas-gestures';
import {
  overlayOf,
  seatsOf,
  useCanvasStandings,
  useEscapeCancelledDrag,
  useEscapeSettledCanvas,
  usePickerModels,
} from './canvas-standings';
import { subjectOf, targetModelIdOf } from './canvas-wiring';
import { pickerOnCanvas } from './picker-on-canvas';
import { removalAsked, useGatewayRemoval } from './removal-flow';

const CANVAS_CLOCK_TICK_MS = 10_000;

/** Everything the page renders the canvas from, wired in one place. */
export type ComposedCanvas = {
  flow: CanvasFlowWiring;
  announced: BindingOutcome | undefined;
  subject: InspectorSubject;
  hasSelection: boolean;
  refusal: string | undefined;
  picker: PickerOnCanvas | undefined;
  removal: RemovalAsked | undefined;
  clearSelection: () => void;
  selectNode: (nodeId: string) => void;
  askRemoval: (nodeId: string) => void;
  onDraftDefined: (definition: SettledDefinition) => void;
};

function draftGraduation(world: CanvasWorld): (definition: SettledDefinition) => void {
  return (definition) => {
    const draft = heldDraft(world.slug);

    if (draft !== undefined) {
      setNodePosition(world.slug, `model:${definition.id}`, draft.seat);
      setNodePosition(world.slug, `target:${definition.id}`, targetSeatBeside(draft.seat));
      keepCanvasPositions(world.slug);
    }

    leaveDrafting(world.slug);
    world.standings.select(undefined);
    closeInspector();
    world.standings.announce({
      kind: 'bound',
      virtualModel: spokenNameOf(definition),
      target: targetNameIn(world.accounts, definition.accountId),
    });
  };
}

function removalAsking(world: CanvasWorld): (nodeId: string) => void {
  return (nodeId) => {
    if (targetModelIdOf(nodeId) === undefined) {
      world.standings.setRemoving(nodeId);

      return;
    }

    askedTargetRemoval(world, nodeId);
  };
}

function composedCanvas(
  world: CanvasWorld,
  pickerModels: ModelListReading,
  deleteGateway: () => void,
): ComposedCanvas {
  const { standings } = world;

  return {
    flow: flowWiring(world),
    announced: standings.announced,
    subject: subjectOf(world.gateway, standings.selection),
    hasSelection: standings.selection !== undefined,
    refusal: standings.refusal,
    picker: pickerOnCanvas(world, pickerModels),
    removal: removalAsked(world, deleteGateway),
    clearSelection: () => {
      standings.select(undefined);
    },
    selectNode: (nodeId) => {
      standings.select(nodeId);
    },
    askRemoval: removalAsking(world),
    onDraftDefined: draftGraduation(world),
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
  onGatewayRemoved: () => void,
): ComposedCanvas | undefined {
  const standings = useCanvasStandings();
  const stored = useSyncExternalStore(subscribeToCanvasPositions, () => canvasPositions(slug));
  const draft = useHeldDraft(slug);
  const define = useDefineVirtualModel();
  const pickerModels = usePickerModels(standings.picker);
  const { data: traffic } = useQuery(engineTrafficQueryOptions);
  const { data: subscriptions = [] } = useQuery(subscriptionsQueryOptions);
  const now = useDisplayTick(CANVAS_CLOCK_TICK_MS);
  const dragging = useRef<DragWatch>({ inFlight: false, escaped: false });
  const view = useRef<ReactFlowInstance | null>(null);
  const deleteGateway = useGatewayRemoval(slug, standings.refuse, onGatewayRemoved);

  useEscapeCancelledDrag(dragging);
  useEscapeSettledCanvas(standings, dragging);

  if (gateway === undefined) {
    return undefined;
  }

  const overlay = overlayOf(draft, standings.picker);
  const graph = canvasGraph(gateway, accounts, overlay, traffic, subscriptions, now);
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

  return composedCanvas(world, pickerModels, deleteGateway);
}
