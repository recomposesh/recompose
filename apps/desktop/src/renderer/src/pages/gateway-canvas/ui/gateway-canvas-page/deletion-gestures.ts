import type { RouteNode } from '@recompose/contracts';
import type { Edge, Node } from '@xyflow/react';

import type { CanvasFlowWiring } from '../gateway-stage/gateway-stage';
import type { CanvasWorld } from './canvas-standings';
import type { SeatReading } from './route-seats';

import { askedTargetRemoval, releasedBinding } from './binding-acts';
import {
  bindingCableId,
  cableSeatOf,
  editingText,
  modelIdOf,
  routerSeatOf,
  targetModelIdOf,
} from './canvas-wiring';
import { routeNodeIn, seatWritten } from './route-seats';

function removalQuestionAsked(world: CanvasWorld, nodes: Node[]): boolean {
  const removable = nodes.find(
    (node) => node.id === 'draft' || node.id === 'gateway' || modelIdOf(node.id) !== undefined,
  );

  if (removable !== undefined) {
    world.standings.setRemoving(removable.id);

    return true;
  }

  const target = nodes.find((node) => targetModelIdOf(node.id) !== undefined);

  if (target !== undefined) {
    askedTargetRemoval(world, target.id);

    return true;
  }

  const router = nodes.find((node) => routerSeatOf(node.id) !== undefined);

  if (router !== undefined) {
    world.standings.setRemoving(router.id);

    return true;
  }

  return false;
}

function releasesIntoADraft(seat: SeatReading, node: RouteNode): boolean {
  return seat.routeNodeId === undefined && node.kind === 'target';
}

/**
 * The card a cable's release would take with it, or nothing where it destroys no work.
 *
 * @summary A cable onto a definition's one stored target releases into a draft that keeps every
 * word a person typed, so nothing is lost and nothing needs asking. Every other binding cable ends
 * on a composition: a cable below the entry holds one child of a ladder, and a cable onto a router
 * holds the whole ladder, so releasing either throws work away. Both name the card at their far
 * end, which is the card whose own Delete press already asks the right question about it.
 */
function releaseDestroys(world: CanvasWorld, edgeId: string): string | undefined {
  const seat = cableSeatOf(edgeId);
  const node = routeNodeIn(world.gateway, seat);

  if (seat === undefined || node === undefined || releasesIntoADraft(seat, node)) {
    return undefined;
  }

  return `${node.kind === 'router' ? 'route' : 'target'}:${seatWritten(seat)}`;
}

function cableQuestionAsked(world: CanvasWorld, cables: readonly Edge[]): boolean {
  const [asking] = cables.flatMap((edge) => {
    const card = releaseDestroys(world, edge.id);

    return card === undefined ? [] : [card];
  });

  if (asking === undefined) {
    return false;
  }

  world.standings.setRemoving(asking);

  return true;
}

function cardDeletionRefused(world: CanvasWorld, nodes: Node[]): boolean {
  return removalQuestionAsked(world, nodes) || nodes.length > 0;
}

function deletionDecision(
  world: CanvasWorld,
  asked: { nodes: Node[]; edges: Edge[] },
): boolean | { nodes: Node[]; edges: Edge[] } {
  if (editingText(document.activeElement) || cardDeletionRefused(world, asked.nodes)) {
    return false;
  }

  const cables = asked.edges.filter((edge) => bindingCableId(edge.id) !== undefined);

  if (cables.length === 0 || cableQuestionAsked(world, cables)) {
    return false;
  }

  return { nodes: [], edges: cables };
}

/**
 * The Delete press answered by what stands selected: a question for a card, a release for a cable.
 *
 * @summary A card never leaves unannounced, so any deletable node turns the press into the removal
 * question and stops the flow from deleting anything itself. A router asks last of the cards,
 * because it is the only one that can take a whole ladder with it. A binding cable passes straight
 * through only while releasing it stands the definition back as a draft rather than destroying
 * work, which stopped being true of every cable the moment a router could stand in one: a cable a
 * release would cost a ladder or a child asks the very question that child's own card asks. The
 * release asks that same reader before it writes rather than trusting the decision that let it
 * through, because releasing by a cable's definition id is exactly how a child's cable once took
 * every sibling with it.
 */
export function deletionWiring(
  world: CanvasWorld,
): Pick<CanvasFlowWiring, 'onBeforeDelete' | 'onEdgesDelete'> {
  return {
    onBeforeDelete: async (asked) => Promise.resolve(deletionDecision(world, asked)),
    onEdgesDelete: (deleted) => {
      for (const edge of deleted) {
        const modelId = bindingCableId(edge.id);

        if (modelId !== undefined && releaseDestroys(world, edge.id) === undefined) {
          releasedBinding(world, modelId);
        }
      }
    },
  };
}
