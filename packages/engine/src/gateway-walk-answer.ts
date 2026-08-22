import type { EngineGateway, EngineVirtualModel } from '@recompose/contracts';

import { nameOfRouter } from '@recompose/contracts';

import type { Crossing } from './gateway-wire';
import type { TranslationRefusal } from './refusal-wire';
import type { WalkResult } from './routing/attempt-walk';

import { unreachableTargetAnswer } from './gateway-answers';
import { attemptsRecorded } from './gateway-walk-notes';
import { refusalResponse } from './gateway-wire';
import { chainedTurn, emptyRouter, exhaustedRouter, unjudgedRequest } from './refusals';
import { routerTheEntryStands } from './router-entry';

export type WalkScene = {
  crossing: Crossing;
  gateway: EngineGateway;
  virtualModel: EngineVirtualModel;
};

type Exhausted = Extract<WalkResult<Response>['verdict'], { outcome: 'exhausted' }>;

function exhaustedAnswer(
  scene: WalkScene,
  result: WalkResult<Response>,
  verdict: Exhausted,
  answerable: Response | undefined,
): Response {
  const router = routerTheEntryStands(scene.virtualModel.routing);

  if (router === undefined) {
    return answerable ?? unreachableTargetAnswer(scene.crossing);
  }

  return refusalResponse(
    scene.crossing.dialect,
    exhaustedRouter(
      scene.gateway.displayName,
      scene.virtualModel.id,
      nameOfRouter(router.policy.mode, router.displayName),
      attemptsRecorded(scene.virtualModel.routing, result.notes),
      verdict.retryAtMs,
    ),
  );
}

type RouterStood = Extract<
  WalkResult<Response>['verdict'],
  { outcome: 'empty-router' | 'chained-turn' | 'unjudged' }
>;

function refusalTheRouterRaises(
  verdict: RouterStood,
  displayName: string,
  model: string,
  name: string,
): TranslationRefusal {
  if (verdict.outcome === 'empty-router') return emptyRouter(displayName, model, name);

  return verdict.outcome === 'chained-turn'
    ? chainedTurn(displayName, model, name)
    : unjudgedRequest(displayName, model, name);
}

function routerAnswer(scene: WalkScene, verdict: RouterStood): Response {
  const name = nameOfRouter(verdict.router.policy.mode, verdict.router.displayName);

  return refusalResponse(
    scene.crossing.dialect,
    refusalTheRouterRaises(verdict, scene.gateway.displayName, scene.virtualModel.id, name),
  );
}

/**
 * The response one walk hands the caller, whichever way the walk ended.
 *
 * @summary A child that answered hands its answer straight through, so a refusal the provider wrote
 * reaches the caller exactly as written and only a refusal recompose raised wears the recompose
 * shape. A ladder that ran out says so, naming every child it touched, while a lone target that ran
 * out was the whole ladder and keeps the answer it already gave, because there is no sibling for a
 * router refusal to speak about. The refusals a router raises before trying anyone name the router
 * the walk actually stood at rather than the one the table opens with, because a ladder that chains
 * puts a different router in the way at each depth.
 */
export function answerTheWalkGives(
  scene: WalkScene,
  result: WalkResult<Response>,
  answerable: Response | undefined,
): Response {
  const verdict = result.verdict;

  if (verdict.outcome === 'answered') return verdict.answer;

  if (
    verdict.outcome === 'empty-router' ||
    verdict.outcome === 'chained-turn' ||
    verdict.outcome === 'unjudged'
  ) {
    return routerAnswer(scene, verdict);
  }

  return exhaustedAnswer(scene, result, verdict, answerable);
}
