import type { GatewayConfig, RouteTarget, VirtualModel } from '@recompose/contracts';

import { nameOfRouter } from '@recompose/contracts';

import type { JudgeBinding } from '../../lib/conditional-draft';
import type { SettledDefinition } from '../../lib/model-draft';
import type { RouterMode, SpreadingMode } from '../../lib/routing-edits';
import type { CanvasWorld } from './canvas-standings';

import { closeInspector, openInspector } from '../../../../shared/lib';
import {
  BORN_ROUTER_MODE,
  draftFilledIn,
  emptyDefinition,
  gatewayDefiningDraft,
} from '../../lib/model-draft';
import { DRAFT_NODE_ID } from '../../lib/node-graph';
import { gatewayJudgingThrough } from '../../lib/routing-births-conditional';
import { gatewayDroppingNode, gatewayRoutingThrough } from '../../lib/routing-edits';
import { editDraft, heldDraft } from '../../lib/use-held-draft';
import { committedPick, graduatedDraft, releasedWithNothingSelected } from './binding-acts';
import { cardAddressOf, modelIdOf, routerAddressOf } from './canvas-wiring';
import { modelHolding, parentRouterAt } from './route-parents';

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

function heldDefinition(world: CanvasWorld): SettledDefinition {
  return heldDraft(world.slug)?.definition ?? emptyDefinition();
}

/**
 * Finishes the held draft as a definition routing through the router the person just described.
 *
 * @summary The mode arrives answered rather than assumed, so a draft never reaches storage
 * spreading a way nobody picked. A draft still missing its name is held with that answer stamped on
 * it, which is what lets the drawer open on the step after the one just answered instead of asking
 * the same question twice.
 */
function draftFinished(world: CanvasWorld, routed: SettledDefinition): void {
  if (heldDraft(world.slug) !== undefined && !draftFilledIn(routed)) {
    routerHeldUntilTheDraftIsNamed(world, routed);

    return;
  }

  const named = { id: routed.id, displayName: routed.displayName };

  committedPick(world, `route:${named.id}`, gatewayDefiningDraft(world.gateway, routed), () => {
    graduatedDraft(world, named, nameOfRouter(routed.routerMode ?? BORN_ROUTER_MODE));
  });
}

/** Finishes the held draft through a router that spreads by rank or by turn. */
export function definedThroughARouter(world: CanvasWorld, mode: SpreadingMode): void {
  draftFinished(world, { ...heldDefinition(world), bindsThrough: 'router', routerMode: mode });
}

/** Finishes the held draft through a router that reads its requests, over the two nodes it needs. */
export function definedThroughAJudgedRouter(
  world: CanvasWorld,
  judge: JudgeBinding,
  elseChild: RouteTarget,
): void {
  draftFinished(world, {
    ...heldDefinition(world),
    bindsThrough: 'router',
    routerMode: 'conditional',
    judge,
    accountId: elseChild.accountId,
    providerModel: elseChild.providerModel,
  });
}

function reboundOntoARouter(
  world: CanvasWorld,
  modelId: string,
  mode: RouterMode,
  written: GatewayConfig,
): void {
  const model = modelHolding(world, modelId);

  if (model === undefined) {
    return;
  }

  committedPick(world, `route:${modelId}`, written, () => {
    world.standings.announce({
      kind: 'rebound',
      virtualModel: model.displayName,
      target: nameOfRouter(mode),
    });
  });
}

/** Puts a fresh spreading router where a bound definition's binding stood, keeping what was there. */
export function routedThroughANewRouter(
  world: CanvasWorld,
  modelId: string,
  mode: SpreadingMode,
): void {
  reboundOntoARouter(world, modelId, mode, gatewayRoutingThrough(world.gateway, modelId, mode));
}

/** The same rebinding under the mode that reads its requests, over the two nodes that shape needs. */
export function judgedThroughANewRouter(
  world: CanvasWorld,
  modelId: string,
  judge: RouteTarget,
  elseChild: RouteTarget,
): void {
  reboundOntoARouter(
    world,
    modelId,
    'conditional',
    gatewayJudgingThrough(world.gateway, modelId, judge, elseChild),
  );
}

/**
 * Whether a router can be born where this cable was let go, which decides if the mode is worth asking.
 *
 * @summary Three shapes can take one: a draft that has bound nothing yet, a definition whose
 * binding a router would stand in front of, and a router's own port. Anything else asks nothing,
 * because a question whose every answer writes nothing is worse than no question.
 */
function aRouterCanStandAt(world: CanvasWorld, from: string): boolean {
  const address = routerAddressOf(from);

  if (address !== undefined) {
    const parent = parentRouterAt(world, address);

    return parent?.model.routing.nodes[parent.routeNodeId]?.kind === 'router';
  }

  const modelId = modelIdOf(from);

  return modelId === undefined ? from === 'draft' : modelHolding(world, modelId) !== undefined;
}

/**
 * Answers the binding ask with a router, wherever the cable that opened it left from.
 *
 * @summary One ask serves three shapes of the same intent, and every one of them asks how the
 * router spreads before anything is written. A draft finishes as a definition routing through a
 * router, a bound definition takes the router in its binding's place and keeps what stood there,
 * and a router's own port nests another. Which of the three modes it becomes is the person's to
 * say in all three: two of these shapes used to assume failover, so a person who wanted a judge
 * watched one appear that they never chose and had to switch it afterwards.
 */
export function boundThroughARouter(world: CanvasWorld, from: string): void {
  const asked = world.standings.picker;

  if (asked === undefined || !('at' in asked) || !aRouterCanStandAt(world, from)) {
    return;
  }

  world.standings.setPicker({
    step: 'router-mode',
    from: asked.from,
    at: asked.at,
    origin: asked.origin,
  });
}

const ELSE_STAYS_REFUSAL =
  'The else branch catches every request no rule matched, so it stays. Change where it goes instead.';

/**
 * Whether one route node is the else branch of the router holding it, which no gesture may remove.
 *
 * @summary A conditional router without an else branch is a shape the stored document refuses, and
 * the walk would strand the judge's fallback with nowhere to land, so the canvas refuses the
 * gesture rather than writing a table the engine would reject on the next request.
 */
function catchesWhatNoRuleMatched(model: VirtualModel, routeNodeId: string): boolean {
  return Object.values(model.routing.nodes).some(
    (node) =>
      node.kind === 'router' &&
      node.policy.mode === 'conditional' &&
      node.policy.elseChild === routeNodeId,
  );
}

/**
 * Takes one route node off the canvas, with everything standing under it.
 *
 * @summary One act serves a target card and a router card, because both stand for a route node and
 * a route node leaves the same way whichever it is. A node below the entry leaves the ladder
 * holding it and the definition keeps serving through whatever else stands there, which is what a
 * person thinning a pool by one asked for. The entry has nothing above it to leave, so removing it
 * releases the binding altogether and stands the definition back as a draft, the way deleting the
 * one thing a virtual model reached has always worked on this canvas. The one node this refuses is
 * a judged router's else branch, because every request no rule matched lands there.
 */
export function removedRouteNode(world: CanvasWorld, nodeId: string): void {
  const address = cardAddressOf(nodeId);

  if (address === undefined) {
    return;
  }

  const parent = parentRouterAt(world, address);

  if (parent === undefined) {
    return;
  }

  if (parent.routeNodeId === parent.model.routing.entry) {
    releasedWithNothingSelected(world, address.modelId);

    return;
  }

  if (catchesWhatNoRuleMatched(parent.model, parent.routeNodeId)) {
    world.standings.refuse(new Error(ELSE_STAYS_REFUSAL));

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
