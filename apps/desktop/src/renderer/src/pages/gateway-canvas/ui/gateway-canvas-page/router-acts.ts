import type { VirtualModel } from '@recompose/contracts';

import { mintRouteNodeId, nameOfRouter } from '@recompose/contracts';

import type { SettledDefinition } from '../../lib/model-draft';
import type { RouteAddress } from '../../lib/route-addresses';
import type { CanvasWorld } from './canvas-standings';

import { closeInspector, openInspector } from '../../../../shared/lib';
import {
  BORN_ROUTER_MODE,
  draftFilledIn,
  emptyDefinition,
  gatewayDefiningRouted,
} from '../../lib/model-draft';
import { DRAFT_NODE_ID } from '../../lib/node-graph';
import { addressWritten } from '../../lib/route-addresses';
import {
  gatewayBindingChild,
  gatewayDroppingNode,
  gatewayRoutingThrough,
} from '../../lib/routing-edits';
import { editDraft, heldDraft } from '../../lib/use-held-draft';
import { committedPick, graduatedDraft, releasedWithNothingSelected } from './binding-acts';
import { cardAddressOf, modelIdOf, routerAddressOf } from './canvas-wiring';
import { modelHolding, parentRouterAt } from './route-parents';

const BORN_ROUTER_NAME = nameOfRouter(BORN_ROUTER_MODE);

/**
 * Answers the ask with a router on a draft nobody has named yet.
 *
 * @summary The stored shape refuses a virtual model with no name and no id, so writing one here
 * would be refused and leave a person watching the picker close on nothing they can act on. The
 * answer lands on the draft instead and the drawer arrives already holding the router step, which
 * is where the name it still needs gets typed. The choice survives, so nobody answers twice.
 */
function routerHeldUntilTheDraftIsNamed(world: CanvasWorld, routed: SettledDefinition): void {
  editDraft(world.slug, routed);
  world.standings.setPicker(undefined);
  world.standings.select(DRAFT_NODE_ID);
  openInspector();
}

function definedThroughARouter(world: CanvasWorld): void {
  const held = heldDraft(world.slug);
  const definition = held?.definition ?? emptyDefinition();
  const routed: SettledDefinition = { ...definition, bindsThrough: 'router' };

  if (held !== undefined && !draftFilledIn(routed)) {
    routerHeldUntilTheDraftIsNamed(world, routed);

    return;
  }

  const named = { id: definition.id, displayName: definition.displayName };

  committedPick(
    world,
    `route:${named.id}`,
    gatewayDefiningRouted(world.gateway, named, BORN_ROUTER_MODE),
    () => {
      graduatedDraft(world, named, BORN_ROUTER_NAME);
    },
  );
}

function routedThroughANewRouter(world: CanvasWorld, modelId: string): void {
  const model = modelHolding(world, modelId);

  if (model === undefined) {
    return;
  }

  committedPick(
    world,
    `route:${modelId}`,
    gatewayRoutingThrough(world.gateway, modelId, BORN_ROUTER_MODE),
    () => {
      world.standings.announce({
        kind: 'rebound',
        virtualModel: model.displayName,
        target: BORN_ROUTER_NAME,
      });
    },
  );
}

/**
 * What the router taking a child is called, in the words the canvas already showed for it.
 *
 * @summary The card, the inspector, and the refusal all read this name, so the live region reads it
 * too rather than naming the definition: one definition can hold many routers, and a person hearing
 * only the definition could not tell which of them just took the child.
 */
function nameOfParentRouter(model: VirtualModel, routeNodeId: string): string | undefined {
  const node = model.routing.nodes[routeNodeId];

  return node?.kind === 'router' ? nameOfRouter(node.policy.mode, node.displayName) : undefined;
}

function nestedUnderARouter(world: CanvasWorld, address: RouteAddress): void {
  const parent = parentRouterAt(world, address);

  if (parent === undefined) {
    return;
  }

  const parentName = nameOfParentRouter(parent.model, parent.routeNodeId);

  if (parentName === undefined) {
    return;
  }

  const born = mintRouteNodeId();

  committedPick(
    world,
    `route:${addressWritten({ modelId: address.modelId, routeNodeId: born })}`,
    gatewayBindingChild(world.gateway, address.modelId, parent.routeNodeId, born, {
      kind: 'router',
      policy: { mode: BORN_ROUTER_MODE },
      children: [],
    }),
    () => {
      world.standings.announce({
        kind: 'nested',
        virtualModel: parent.model.displayName,
        parentRouter: parentName,
        target: BORN_ROUTER_NAME,
      });
    },
  );
}

/**
 * Answers the binding ask with a router, wherever the cable that opened it left from.
 *
 * @summary One ask serves three shapes of the same intent. A draft finishes as a definition
 * routing through a router, so a person composing top down never detours through a target they
 * did not want. A bound definition takes the router in its binding's place and keeps what stood
 * there as the router's first child, which is what dropping a router onto a bound model means. A
 * router's own port nests another, so one gesture reaches a nested router rather than two.
 */
export function boundThroughARouter(world: CanvasWorld, from: string): void {
  const address = routerAddressOf(from);

  if (address !== undefined) {
    nestedUnderARouter(world, address);

    return;
  }

  const modelId = modelIdOf(from);

  if (modelId !== undefined) {
    routedThroughANewRouter(world, modelId);

    return;
  }

  if (from === 'draft') {
    definedThroughARouter(world);
  }
}

/**
 * Takes one route node off the canvas, with everything standing under it.
 *
 * @summary One act serves a target card and a router card, because both stand for a route node and
 * a route node leaves the same way whichever it is. A node below the entry leaves the ladder
 * holding it and the definition keeps serving through whatever else stands there, which is what a
 * person thinning a pool by one asked for. The entry has nothing above it to leave, so removing it
 * releases the binding altogether and stands the definition back as a draft, the way deleting the
 * one thing a virtual model reached has always worked on this canvas.
 */
export function removedRouteNode(world: CanvasWorld, nodeId: string): void {
  const address = cardAddressOf(nodeId);
  const parent = address === undefined ? undefined : parentRouterAt(world, address);

  if (address === undefined || parent === undefined) {
    return;
  }

  if (parent.routeNodeId === parent.model.routing.entry) {
    releasedWithNothingSelected(world, address.modelId);

    return;
  }

  world.define.mutate(gatewayDroppingNode(world.gateway, address.modelId, parent.routeNodeId), {
    onSuccess: () => {
      world.standings.select(undefined);
      closeInspector();
    },
    onError: world.standings.refuse,
  });
}
