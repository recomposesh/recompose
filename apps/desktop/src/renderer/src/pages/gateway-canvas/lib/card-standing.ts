import type {
  GatewayConfig,
  GatewayCooldowns,
  GatewayTraffic,
  RequestOutcome,
} from '@recompose/contracts';

import type { CarriedTraffic } from './cable-traffic';
import type { CanvasNode, PlacedRouteNode } from './canvas-cards';

import { carriedBy, standingCarried } from './cable-traffic';

/** One card at its seat, paired with the walk that placed it there. */
export type SeatedCard = { placed: PlacedRouteNode; card: CanvasNode };

/**
 * What the engine says about this gateway right now, beside what its stored table says it holds.
 *
 * @summary The readings travel together because a card reads itself off all of them, and threading
 * them apart would leave every function between here and a card carrying one more argument that
 * only one card ever looks at.
 */
export type EngineReadings = {
  carried: CarriedTraffic;
  standingDown: Readonly<Record<string, Readonly<Record<string, number>>>>;
  now: number;
};

/** Everything live the cards of one gateway read themselves against, gathered once per draw. */
export function readingsFor(
  gateway: GatewayConfig,
  traffic: GatewayTraffic,
  now: number,
  cooling: GatewayCooldowns,
): EngineReadings {
  return {
    carried: carriedBy(gateway, traffic, now),
    standingDown: cooling[gateway.slug] ?? {},
    now,
  };
}

function standsDownNow(readings: EngineReadings, placed: PlacedRouteNode): boolean {
  const coolUntilMs = readings.standingDown[placed.modelId]?.[placed.walked.routeNodeId];

  return coolUntilMs !== undefined && coolUntilMs > readings.now;
}

/**
 * The judge card as it stands right now, which is the one card a reading paints rather than a cable.
 *
 * @summary A person asks the judge one question, so what the judge is doing has no cable of its own
 * to light: the tie says which router it belongs to rather than where a request went. The card
 * therefore carries the standing, which is what lets a cooling judge say so where a person is
 * already looking rather than in a badge counting seconds down. A window the engine pushed outranks
 * whatever last flowed, because a node standing down cannot answer the next request however well it
 * answered the last, and it lapses on its own the moment the clock passes it.
 */
export function cardStanding(
  seated: SeatedCard,
  painted: Readonly<Record<string, RequestOutcome>>,
  readings: EngineReadings,
): CanvasNode {
  const { placed, card } = seated;

  if (card.kind !== 'judge') {
    return card;
  }

  return {
    ...card,
    standing: standsDownNow(readings, placed)
      ? ('cooling' as const)
      : (standingCarried(painted[placed.walked.routeNodeId]) ?? 'resting'),
  };
}
