import type { RouteTarget } from '@recompose/contracts';

import type { RouterMode } from '../../lib/routing-edits';
import type { CanvasWorld, DroppedAsk } from './canvas-standings';
import type { NestingAsk } from './nested-routers';

import { modelIdOf, routerAddressOf } from './canvas-wiring';
import {
  NOTHING_NAMED,
  nestedJudgedRouterWritten,
  nestedRouterModeAnswered,
} from './nested-routers';
import {
  definedThroughAJudgedRouter,
  definedThroughARouter,
  judgedThroughANewRouter,
  routedThroughANewRouter,
} from './router-acts';

/**
 * The mode a person just picked, carried to whichever of the three births the cable opened.
 *
 * @summary Conditional never writes here whatever the shape, because its stored form names a judge
 * and an else child and a router born holding neither is a table the schema refuses. So that answer
 * opens the same walk for all three shapes, and the two spreading modes store at once.
 */
export function routerModeAnswered(world: CanvasWorld, asked: DroppedAsk, mode: RouterMode): void {
  if (mode === 'conditional') {
    world.standings.setPicker({ ...asked, step: 'nesting', born: NOTHING_NAMED });

    return;
  }

  if (routerAddressOf(asked.from) !== undefined) {
    nestedRouterModeAnswered(world, asked, mode);

    return;
  }

  const modelId = modelIdOf(asked.from);

  if (modelId !== undefined) {
    routedThroughANewRouter(world, modelId, mode);

    return;
  }

  if (asked.from === 'draft') {
    definedThroughARouter(world, mode);
  }
}

function judgedRouterWritten(
  world: CanvasWorld,
  asked: NestingAsk,
  judge: { accountId: string; providerModel: string },
  elseChild: RouteTarget,
): void {
  if (routerAddressOf(asked.from) !== undefined) {
    nestedJudgedRouterWritten(world, asked, { kind: 'target', ...judge }, elseChild);

    return;
  }

  const modelId = modelIdOf(asked.from);

  if (modelId !== undefined) {
    judgedThroughANewRouter(world, modelId, { kind: 'target', ...judge }, elseChild);

    return;
  }

  if (asked.from === 'draft') {
    definedThroughAJudgedRouter(world, judge, elseChild);
  }
}

/**
 * The walk once a real model completed the step standing, which is a judge or the whole birth.
 *
 * @summary Naming the judge leaves its account behind, because the else branch asks the same
 * question again and a list already narrowed would answer it for the person. Naming the else model
 * is the last answer the stored shape waits on, so the router, its judge, and its fallback all
 * reach the document in the single write that shape can take, wherever the cable was let go.
 */
export function judgedRouterModelAnswered(
  world: CanvasWorld,
  asked: NestingAsk,
  providerModel: string,
): void {
  const { judge, accountId } = asked.born;

  if (judge === undefined) {
    world.standings.setPicker({
      ...asked,
      born: { judge: { accountId, providerModel }, accountId: '' },
    });

    return;
  }

  judgedRouterWritten(world, asked, judge, { kind: 'target', accountId, providerModel });
}
