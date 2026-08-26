import type { EngineGateway, EngineVirtualModel } from '@recompose/contracts';

import { nameOfRouter } from '@recompose/contracts';

import type { Crossing } from './gateway-wire';
import type { TranslationRefusal } from './refusal-wire';
import type { WalkResult } from './routing/attempt-walk';

import { unreachableTargetAnswer } from './gateway-answers';
import { attemptsRecorded, diagnosisTheWalkLeaves } from './gateway-walk-notes';
import { refusalResponse } from './gateway-wire';
import { gatewayDiagnosed } from './provider/serving-turn';
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
  router: string | undefined,
): Response {
  if (router === undefined) {
    return answerable ?? unreachableTargetAnswer(scene.crossing);
  }

  return refusalResponse(
    scene.crossing.dialect,
    exhaustedRouter(
      scene.gateway.displayName,
      scene.virtualModel.id,
      router,
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
    : unjudgedRequest(displayName, model, name, verdict.because);
}

function routerAnswer(scene: WalkScene, verdict: RouterStood): Response {
  const name = nameOfRouter(verdict.router.policy.mode, verdict.router.displayName);

  return refusalResponse(
    scene.crossing.dialect,
    refusalTheRouterRaises(verdict, scene.gateway.displayName, scene.virtualModel.id, name),
  );
}

type WalkFailed = Exclude<WalkResult<Response>['verdict'], { outcome: 'answered' }>;

/**
 * The router that stood between this request and a child, named as every surface names one.
 *
 * @summary A router that settled the walk itself names the router the walk actually stood at, which
 * a ladder that chains makes different from the one the table opens with. A walk that ran out of
 * children asks the table instead, and answers nothing where one target stood alone, because a lone
 * target is the whole ladder and no router was ever in the way.
 */
function routerInTheWay(scene: WalkScene, verdict: WalkFailed): string | undefined {
  if (verdict.outcome !== 'exhausted') {
    return nameOfRouter(verdict.router.policy.mode, verdict.router.displayName);
  }

  const router = routerTheEntryStands(scene.virtualModel.routing);

  return router === undefined ? undefined : nameOfRouter(router.policy.mode, router.displayName);
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
 *
 * Every way but an answer leaves the walk's own account on the turn, so the row the drawer lists
 * names the same children in the same words as the refusal the caller was handed.
 */
export function answerTheWalkGives(
  scene: WalkScene,
  result: WalkResult<Response>,
  answerable: Response | undefined,
): Response {
  const verdict = result.verdict;

  if (verdict.outcome === 'answered') return verdict.answer;

  const router = routerInTheWay(scene, verdict);

  gatewayDiagnosed(diagnosisTheWalkLeaves(scene.virtualModel.routing, result.notes, router));

  return verdict.outcome === 'exhausted'
    ? exhaustedAnswer(scene, result, verdict, answerable, router)
    : routerAnswer(scene, verdict);
}
