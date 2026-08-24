import type { RouteNode } from '@recompose/contracts';
import type { Edge, Node } from '@xyflow/react';

import type { RouteAddress } from '../../lib/route-addresses';
import type { CanvasFlowWiring } from '../gateway-stage/gateway-stage';
import type { CanvasWorld } from './canvas-standings';

import { routeNodeIn, addressWritten } from '../../lib/route-addresses';
import { askedTargetRemoval, releasedWithTheDraftSelected } from './binding-acts';
import {
  bindingCableId,
  cableAddressOf,
  editingText,
  modelIdOf,
  routerAddressOf,
  targetModelIdOf,
} from './canvas-wiring';

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

  const router = nodes.find((node) => routerAddressOf(node.id) !== undefined);

  if (router !== undefined) {
    world.standings.setRemoving(router.id);

    return true;
  }

  return false;
}

function releasesIntoADraft(address: RouteAddress, node: RouteNode): boolean {
  return address.routeNodeId === undefined && node.kind === 'target';
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
  const address = cableAddressOf(edgeId);
  const node = routeNodeIn(world.gateway, address);

  if (address === undefined || node === undefined || releasesIntoADraft(address, node)) {
    return undefined;
  }

  return `${node.kind === 'router' ? 'route' : 'target'}:${addressWritten(address)}`;
}

/**
 * Releases one binding cable, asking first wherever letting go would cost a person work.
 *
 * @summary The menu and the Delete press are two ways into one release, so both read the same
 * question: a cable whose release stands the definition back as a draft goes straight through,
 * and one holding a ladder or a child raises the very question that child's own card raises.
 */
export function releaseAskedFor(world: CanvasWorld, edgeId: string): void {
  const modelId = bindingCableId(edgeId);

  if (modelId === undefined) {
    return;
  }

  const asking = releaseDestroys(world, edgeId);

  if (asking === undefined) {
    releasedWithTheDraftSelected(world, modelId);

    return;
  }

  world.standings.setRemoving(asking);
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
          releasedWithTheDraftSelected(world, modelId);
        }
      }
    },
  };
}
