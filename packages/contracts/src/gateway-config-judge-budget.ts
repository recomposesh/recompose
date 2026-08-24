import { z } from 'zod';

import type { Migration } from './migration';

import { BORN_JUDGE_BOUND_MS } from './gateway-routing-conditional';

const SUPERSEDED_JUDGE_BOUND_MS = 3000;

const storedConditionalSchema = z.looseObject({
  mode: z.literal('conditional'),
  judgeBoundMs: z.literal(SUPERSEDED_JUDGE_BOUND_MS),
});

const storedRouterSchema = z.looseObject({ policy: storedConditionalSchema });

const storedRoutingSchema = z.looseObject({ nodes: z.record(z.string(), z.unknown()) });

const storedModelSchema = z.looseObject({});

const storedModelsSchema = z.array(z.unknown());

function nodeWaitingLonger(node: unknown): unknown {
  const router = storedRouterSchema.safeParse(node);

  if (!router.success) {
    return node;
  }

  return {
    ...router.data,
    policy: { ...router.data.policy, judgeBoundMs: BORN_JUDGE_BOUND_MS },
  };
}

function routingWaitingLonger(routing: unknown): unknown {
  const table = storedRoutingSchema.safeParse(routing);

  if (!table.success) {
    return routing;
  }

  const nodes = Object.entries(table.data.nodes).map(([id, node]): [string, unknown] => [
    id,
    nodeWaitingLonger(node),
  ]);

  return { ...table.data, nodes: Object.fromEntries(nodes) };
}

function modelWaitingLonger(model: unknown): unknown {
  const held = storedModelSchema.safeParse(model);

  return held.success
    ? { ...held.data, routing: routingWaitingLonger(held.data['routing']) }
    : model;
}

/**
 * Every stored conditional router that never chose how long its judge had now waits half a minute.
 *
 * @summary Only the three seconds the born policy handed out is lifted, because that is the one
 * value nobody picked: a router carrying any other number carries a person's decision, and a
 * migration that rewrote it would take that decision away on the next load. The lift runs once per
 * document, so a person who sets three seconds after it has run keeps them.
 */
export const noStoredRouterEverChoseHowLongItsJudgeHad: Migration = {
  from: 4,
  migrate: (doc) => {
    const stored = storedModelsSchema.safeParse(doc['virtualModels']);

    return stored.success
      ? { ...doc, virtualModels: stored.data.map(modelWaitingLonger), schemaVersion: 5 }
      : { ...doc, schemaVersion: 5 };
  },
};
