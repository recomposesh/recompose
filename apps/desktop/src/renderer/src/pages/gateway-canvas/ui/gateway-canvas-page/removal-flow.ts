import type { RouteNode, VirtualModel } from '@recompose/contracts';
import type { QueryClient } from '@tanstack/react-query';

import { nameOfRouter } from '@recompose/contracts';

import type { CanvasWorld } from './canvas-standings';

import {
  engineLogsQueryOptions,
  engineStatesQueryOptions,
  engineTrafficQueryOptions,
} from '../../../../shared/api';
import { forgetLookedAtGateway } from '../../../../shared/lib';
import { dropCanvasPositions } from '../../lib/canvas-position-store';
import { dropCanvasViewport } from '../../lib/canvas-viewport-store';
import { emptyDefinition } from '../../lib/model-draft';
import { heldDraft, leaveDrafting } from '../../lib/use-held-draft';
import { removedDefinition, spokenNameOf, targetNameIn } from './binding-acts';
import { cardAddressOf, modelIdOf } from './canvas-wiring';
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

function routeNodeName(world: CanvasWorld, node: RouteNode): string {
  return node.kind === 'router'
    ? nameOfRouter(node.policy.mode, node.displayName)
    : targetNameIn(world.accounts, node.accountId);
}

function entryRead(world: CanvasWorld, node: RouteNode): RouteNodeReading {
  return {
    kind: node.kind === 'router' ? 'router' : 'target',
    name: routeNodeName(world, node),
  };
}

function childRead(world: CanvasWorld, node: RouteNode): RouteNodeReading {
  return {
    kind: node.kind === 'router' ? 'child-router' : 'child-target',
    name: routeNodeName(world, node),
  };
}

/**
 * How one route node reads, told apart by where in the routing it stands.
 *
 * @summary The entry and a node below it leave the composition differently, so they ask
 * differently: a child leaves the ladder holding it and the rest keeps serving, while the entry
 * takes the definition's whole binding with it. The node's own kind supplies the name.
 */
function readingOfTheNode(
  world: CanvasWorld,
  model: VirtualModel,
  routeNodeId: string,
): RouteNodeReading | undefined {
  const node = model.routing.nodes[routeNodeId];

  if (node === undefined) {
    return undefined;
  }

  return routeNodeId === model.routing.entry ? entryRead(world, node) : childRead(world, node);
}

function routeNodeRemoval(world: CanvasWorld, nodeId: string): RemovalAsked | undefined {
  const address = cardAddressOf(nodeId);
  const model = world.gateway.virtualModels.find((held) => held.id === address?.modelId);

  if (model === undefined) {
    return undefined;
  }

  const reading = readingOfTheNode(world, model, address?.routeNodeId ?? model.routing.entry);

  if (reading === undefined) {
    return undefined;
  }

  const putTheAskAway = askPutAway(world);

  return {
    ...reading,
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

/**
 * Everything this side held about one gateway, forgotten the moment the delete lands.
 *
 * @summary A landed delete drops the arrangement, the viewport, the draft, the last-looked-at
 * memory, and every cached reading held under the slug, because a gateway that no longer exists
 * must not greet its own ghost on the next visit.
 */
export function forgottenEverywhere(queryClient: QueryClient, slug: string): void {
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
