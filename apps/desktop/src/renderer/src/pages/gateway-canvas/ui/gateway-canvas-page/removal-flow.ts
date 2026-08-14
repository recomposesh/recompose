import type { RouteNode } from '@recompose/contracts';
import type { QueryClient } from '@tanstack/react-query';

import { useQueryClient } from '@tanstack/react-query';

import type { CanvasWorld } from './canvas-standings';

import {
  engineLogsQueryOptions,
  engineStatesQueryOptions,
  engineTrafficQueryOptions,
  useRemoveGateway,
} from '../../../../shared/api';
import { forgetLookedAtGateway } from '../../../../shared/lib';
import { dropCanvasPositions } from '../../lib/canvas-position-store';
import { dropCanvasViewport } from '../../lib/canvas-viewport-store';
import { emptyDefinition } from '../../lib/model-draft';
import { heldDraft, leaveDrafting } from '../../lib/use-held-draft';
import { routerName } from '../router-node/router-reading';
import { removedDefinition, spokenNameOf, targetNameIn } from './binding-acts';
import { cardSeatOf, modelIdOf } from './canvas-wiring';
import { removedRouteNode } from './router-acts';

/** The removal a Delete press asked for, standing until the person answers. */
export type RemovalAsked = {
  kind: 'virtual-model' | 'gateway' | 'target' | 'child-target' | 'router' | 'child-router';
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
};

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

function askPutAway(world: CanvasWorld): () => void {
  return () => {
    world.standings.setRemoving(undefined);
  };
}

function gatewayRemoval(world: CanvasWorld, deleteGateway: () => void): RemovalAsked {
  const putTheAskAway = askPutAway(world);

  return {
    kind: 'gateway',
    name: world.gateway.displayName || world.slug,
    onConfirm: () => {
      deleteGateway();
      putTheAskAway();
    },
    onCancel: putTheAskAway,
  };
}

type RouteNodeReading = Pick<RemovalAsked, 'kind' | 'name'>;

function routeNodeRead(world: CanvasWorld, node: RouteNode, atTheEntry: boolean): RouteNodeReading {
  if (node.kind === 'router') {
    return {
      kind: atTheEntry ? 'router' : 'child-router',
      name: routerName(node.policy.mode, node.displayName),
    };
  }

  return {
    kind: atTheEntry ? 'target' : 'child-target',
    name: targetNameIn(world.accounts, node.accountId),
  };
}

/**
 * The question a route node's card asks, read against where in the routing that node stands.
 *
 * @summary The entry and a node below it leave the composition differently, so they ask
 * differently: a child leaves the ladder holding it and the rest keeps serving, while the entry
 * takes the definition's whole binding with it. The card's own kind supplies the name.
 */
function routeNodeRemoval(world: CanvasWorld, nodeId: string): RemovalAsked | undefined {
  const seat = cardSeatOf(nodeId);
  const model = world.gateway.virtualModels.find((held) => held.id === seat?.modelId);

  if (model === undefined) {
    return undefined;
  }

  const routeNodeId = seat?.routeNodeId ?? model.routing.entry;
  const node = model.routing.nodes[routeNodeId];

  if (node === undefined) {
    return undefined;
  }

  const putTheAskAway = askPutAway(world);

  return {
    ...routeNodeRead(world, node, routeNodeId === model.routing.entry),
    onConfirm: () => {
      removedRouteNode(world, nodeId);
      putTheAskAway();
    },
    onCancel: putTheAskAway,
  };
}

function definitionRemoval(world: CanvasWorld, nodeId: string): RemovalAsked {
  const putTheAskAway = askPutAway(world);

  return {
    kind: 'virtual-model',
    name: removalName(world, nodeId),
    onConfirm: () => {
      removedDefinition(world, nodeId);
      putTheAskAway();
    },
    onCancel: putTheAskAway,
  };
}

/**
 * The removal question the canvas is standing on, or nothing while no Delete press asked one.
 *
 * @summary The question reads what the press named: the gateway asks about itself, any card
 * standing for a route node asks about that node and what leaves with it, and anything else asks
 * about a definition or the held draft. Every answer puts the ask away, so no question outlives
 * the person answering it.
 */
export function removalAsked(
  world: CanvasWorld,
  deleteGateway: () => void,
): RemovalAsked | undefined {
  const nodeId = world.standings.removing;

  if (nodeId === undefined) {
    return undefined;
  }

  if (nodeId === 'gateway') {
    return gatewayRemoval(world, deleteGateway);
  }

  return routeNodeRemoval(world, nodeId) ?? definitionRemoval(world, nodeId);
}

function withoutGateway<Carried>(
  slug: string,
  held: Record<string, Carried> | undefined,
): Record<string, Carried> | undefined {
  if (held === undefined) {
    return held;
  }

  const remaining = { ...held };

  delete remaining[slug];

  return remaining;
}

function forgottenEverywhere(queryClient: QueryClient, slug: string): void {
  dropCanvasPositions(slug);
  dropCanvasViewport(slug);
  leaveDrafting(slug);
  forgetLookedAtGateway(slug);
  queryClient.removeQueries({ queryKey: engineLogsQueryOptions(slug).queryKey });
  queryClient.setQueryData(engineTrafficQueryOptions.queryKey, (held) =>
    withoutGateway(slug, held),
  );
  queryClient.setQueryData(engineStatesQueryOptions.queryKey, (held) => withoutGateway(slug, held));
}

/**
 * The one act that deletes this gateway, leaving nothing of it behind on this side.
 *
 * @summary A landed delete drops the arrangement, the viewport, the draft, the last-looked-at
 * memory, and every cached reading held under the slug, because a gateway that no longer exists
 * must not greet its own ghost on the next visit. Only then does the caller hear it is gone, so
 * the leave lands on a canvas already clean. A refused delete answers through the standings.
 */
export function useGatewayRemoval(
  slug: string,
  refuse: (failure: unknown) => void,
  onGatewayRemoved: () => void,
): () => void {
  const queryClient = useQueryClient();
  const removeGateway = useRemoveGateway();

  return () => {
    removeGateway.mutate(
      { slug },
      {
        onSuccess: () => {
          forgottenEverywhere(queryClient, slug);
          onGatewayRemoved();
        },
        onError: refuse,
      },
    );
  };
}
