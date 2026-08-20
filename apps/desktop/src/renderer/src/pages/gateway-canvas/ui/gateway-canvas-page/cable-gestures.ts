import type { OnConnectEnd } from '@xyflow/react';

import type { XY } from '../../lib/canvas-positions';
import type { CanvasFlowWiring } from '../gateway-stage/gateway-stage';
import type { CanvasWorld } from './canvas-standings';

import { closeInspector } from '../../../../shared/lib';
import { flowPointOf, viewportOf } from '../../lib/canvas-viewport';
import { emptyDefinition } from '../../lib/model-draft';
import { CARD_MEASURE } from '../../lib/tidy-layout';
import { heldDraft, startDrafting } from '../../lib/use-held-draft';
import { oneTargetRule } from './cable-rules';
import { revealOn } from './canvas-standings';
import { cableAddressOf, modelIdOf, routerAddressOf, targetAccountIdIn } from './canvas-wiring';

const REFUSED_LANDING =
  'A cable binds a virtual model or a router to a provider it does not already hold.';

/**
 * The seat a card born under a pointer takes, which centers it on the point rather than hanging it.
 *
 * @summary A seat names a card's top corner while a pointer names the middle of what the person
 * aimed at, so half the card comes off the point to turn one into the other. Only a birth a pointer
 * named reads this: a seat the canvas worked out is already a corner, and lifting one again walks
 * the card up the column by half a card every time it is asked for.
 */
function seatUnder(pointer: XY): XY {
  return { x: pointer.x, y: pointer.y - CARD_MEASURE.height / 2 };
}

/** Stands a draft virtual model at a seat and turns the drawer to it. */
export function birthedDraftAt(world: CanvasWorld, seat: XY): void {
  const definition = heldDraft(world.slug)?.definition ?? emptyDefinition();

  startDrafting(world.slug, definition, seat);
  revealOn(world.standings, 'draft');
}

function openedStageTwo(
  world: CanvasWorld,
  from: string,
  target: string,
  replacing?: string,
): void {
  const accountId = targetAccountIdIn(world.gateway, target);

  if (accountId !== undefined) {
    world.standings.setPicker({
      step: 'provider-model',
      from,
      accountId,
      anchor: target,
      replacing,
    });
  }
}

function escapedOrLanded(world: CanvasWorld, landed: boolean): boolean {
  world.dragging.current.inFlight = false;

  if (world.dragging.current.escaped) {
    world.dragging.current.escaped = false;

    return true;
  }

  return landed;
}

function asksWhatToBind(from: string): boolean {
  return from === 'draft' || modelIdOf(from) !== undefined || routerAddressOf(from) !== undefined;
}

function landedOnOpenCanvas(world: CanvasWorld, from: string, at: XY): void {
  if (from === 'gateway') {
    birthedDraftAt(world, seatUnder(at));

    return;
  }

  if (asksWhatToBind(from)) {
    world.standings.setPicker({
      step: 'kind',
      from,
      at: seatUnder(at),
      origin: 'drop',
    });

    if (from === 'draft') {
      closeInspector();
    }
  }
}

function droppedCableLanding(world: CanvasWorld): OnConnectEnd {
  return (_, state) => {
    if (escapedOrLanded(world, state.isValid === true) || state.to === null) {
      return;
    }

    if (state.toHandle !== null) {
      world.standings.announce({ kind: 'refused', refusal: REFUSED_LANDING });

      return;
    }

    landedOnOpenCanvas(
      world,
      state.fromNode.id,
      flowPointOf(state.to, viewportOf(world.view.current)),
    );
  };
}

/**
 * Everything a cable drag answers, from the rule that lights a landing to what a release writes.
 *
 * @summary One module holds the whole gesture, because the rule a card lights by, the drop that
 * opens a pick, and the escape that throws the drag away are one decision read three times: split
 * across modules they would drift into a card lighting for a landing the release then refuses.
 */
export function connectWiring(
  world: CanvasWorld,
): Pick<
  CanvasFlowWiring,
  | 'isValidConnection'
  | 'onConnect'
  | 'onConnectStart'
  | 'onConnectEnd'
  | 'onReconnect'
  | 'onReconnectStart'
  | 'onReconnectEnd'
> {
  const { dragging } = world;

  return {
    isValidConnection: oneTargetRule(world.gateway),
    onConnect: (connection) => {
      if (dragging.current.escaped) {
        return;
      }

      openedStageTwo(world, connection.source, connection.target);
    },
    onConnectStart: () => {
      dragging.current.inFlight = true;
    },
    onConnectEnd: droppedCableLanding(world),
    onReconnect: (oldEdge, connection) => {
      if (dragging.current.escaped) {
        return;
      }

      if (oldEdge.source === connection.source) {
        openedStageTwo(
          world,
          connection.source,
          connection.target,
          cableAddressOf(oldEdge.id)?.routeNodeId,
        );
      }
    },
    onReconnectStart: () => {
      dragging.current.inFlight = true;
    },
    onReconnectEnd: () => {
      dragging.current.inFlight = false;
      dragging.current.escaped = false;
    },
  };
}
