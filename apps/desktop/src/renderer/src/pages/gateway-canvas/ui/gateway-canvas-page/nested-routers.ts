import type { GatewayConfig, RouteTarget } from '@recompose/contracts';

import { mintRouteNodeId, nameOfRouter } from '@recompose/contracts';

import type { RouteAddress } from '../../lib/route-addresses';
import type { RouterMode } from '../../lib/routing-edits';
import type { PickerStage } from '../drop-picker/picker-stages';
import type { BornConditional, CanvasWorld, DroppedAsk, PickerStanding } from './canvas-standings';

import { addressWritten } from '../../lib/route-addresses';
import { elseCardWritten, gatewayNestingAJudgedRouter } from '../../lib/routing-births-conditional';
import { gatewayBindingChild } from '../../lib/routing-edits';
import { committedPick } from './binding-acts';
import { routerAddressOf } from './canvas-wiring';
import { parentRouterAt } from './route-parents';

/** The ask standing while a nested conditional router gathers the two nodes its shape needs. */
export type NestingAsk = Extract<PickerStanding, { step: 'nesting' }>;

/** A conditional birth before its walk has named anything, whichever shape opened the ask. */
export const NOTHING_NAMED: BornConditional = { judge: undefined, accountId: '' };

/** The router a child is joining, named the way the canvas already showed it. */
type NestedParent = {
  modelId: string;
  routerId: string;
  virtualModel: string;
  parentRouter: string;
};

/**
 * The router a route address stands for, with the words the live region will name it by.
 *
 * @summary The card, the inspector, and the refusal all read the parent's own name, so the live
 * region reads it too rather than naming the definition: one definition can hold many routers, and
 * a person hearing only the definition could not tell which of them just took the child. A port
 * standing for anything but a router names nothing, because nothing there can take a child at all.
 */
function parentTaking(world: CanvasWorld, address: RouteAddress): NestedParent | undefined {
  const parent = parentRouterAt(world, address);
  const node = parent?.model.routing.nodes[parent.routeNodeId];

  if (parent === undefined || node?.kind !== 'router') {
    return undefined;
  }

  return {
    modelId: address.modelId,
    routerId: parent.routeNodeId,
    virtualModel: parent.model.displayName,
    parentRouter: nameOfRouter(node.policy.mode, node.displayName),
  };
}

type NestedWrite = {
  born: string;
  mode: RouterMode;
  written: (parent: NestedParent) => GatewayConfig;
};

function nestedRouterWritten(world: CanvasWorld, asked: DroppedAsk, nesting: NestedWrite): void {
  const address = routerAddressOf(asked.from);
  const parent = address === undefined ? undefined : parentTaking(world, address);

  if (address === undefined || parent === undefined) {
    return;
  }

  const written = nesting.written(parent);

  committedPick(
    world,
    `route:${addressWritten({ modelId: address.modelId, routeNodeId: nesting.born })}`,
    written,
    () => {
      world.standings.announce({
        kind: 'nested',
        virtualModel: parent.virtualModel,
        parentRouter: parent.parentRouter,
        target: nameOfRouter(nesting.mode),
      });
    },
    elseCardWritten(written, address.modelId, nesting.born),
  );
}

/**
 * Nests a router spreading the way the person just said, or carries a conditional one on.
 *
 * @summary The two spreading modes owe nothing more, so they store at once the way a nested router
 * always has. Conditional owes a judge and an else child, and the stored shape refuses a router
 * missing either, so that answer opens the walk that gathers both rather than writing half of one.
 */
export function nestedRouterModeAnswered(
  world: CanvasWorld,
  asked: DroppedAsk,
  mode: RouterMode,
): void {
  if (mode === 'conditional') {
    world.standings.setPicker({ ...asked, step: 'nesting', born: NOTHING_NAMED });

    return;
  }

  const born = mintRouteNodeId();

  nestedRouterWritten(world, asked, {
    born,
    mode,
    written: (parent) =>
      gatewayBindingChild(world.gateway, parent.modelId, parent.routerId, born, {
        kind: 'router',
        policy: { mode },
        children: [],
      }),
  });
}

/** Which step a nested conditional stands on, read out of what its walk has already named. */
export function nestingStage(born: BornConditional): PickerStage {
  const asks = born.judge === undefined ? 'judge' : 'else';

  return born.accountId === ''
    ? { step: 'account', asks }
    : { step: 'provider-model', accountId: born.accountId, asks };
}

/** The walk once it settled which account answers the step standing, whichever step that is. */
export function nestingAccountAnswered(
  world: CanvasWorld,
  asked: NestingAsk,
  accountId: string,
): void {
  world.standings.setPicker({ ...asked, born: { ...asked.born, accountId } });
}

/** One conditional router nested under a stored router, over the two nodes its shape needs. */
export function nestedJudgedRouterWritten(
  world: CanvasWorld,
  asked: DroppedAsk,
  judge: RouteTarget,
  elseChild: RouteTarget,
): void {
  const born = mintRouteNodeId();

  nestedRouterWritten(world, asked, {
    born,
    mode: 'conditional',
    written: (parent) =>
      gatewayNestingAJudgedRouter(
        world.gateway,
        { modelId: parent.modelId, routerId: parent.routerId, bornId: born },
        judge,
        elseChild,
      ),
  });
}

function modeReopened(world: CanvasWorld, asked: NestingAsk): void {
  world.standings.setPicker({
    step: 'router-mode',
    from: asked.from,
    at: asked.at,
    origin: asked.origin,
  });
}

/**
 * The way back out of the step a nested conditional stands on, which is the step before it.
 *
 * @summary A model list steps back to the account list it came from, an unanswered judge steps back
 * to the mode question, and the else branch steps back to the judge whole, which is where a person
 * who wants a different reader has to start again anyway.
 */
export function nestingSteppedBack(world: CanvasWorld, asked: NestingAsk): () => void {
  return () => {
    if (asked.born.accountId !== '') {
      nestingAccountAnswered(world, asked, '');

      return;
    }

    if (asked.born.judge === undefined) {
      modeReopened(world, asked);

      return;
    }

    world.standings.setPicker({ ...asked, born: NOTHING_NAMED });
  };
}
