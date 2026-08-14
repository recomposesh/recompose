import type { EngineRouteNode, EngineRouting } from '@recompose/contracts';

import type { EngineRouter } from './routing/route-table';

/**
 * The node a table serves from, which is a target for a direct binding and a router for a ladder.
 *
 * @summary Every reader that needs to tell one shape from the other asks here rather than reaching
 * into the table itself, because the two answers lead to different refusals and different memory. A
 * table whose entry names nothing answers nothing, so a reader refuses rather than guessing at a node
 * a person never wired.
 */
export function entryNodeOf(routing: EngineRouting): EngineRouteNode | undefined {
  return routing.nodes[routing.entry];
}

/**
 * The router a table serves from, or nothing where one target stands alone.
 *
 * @summary A ladder is the only shape that spreads, rotates, cools, or exhausts, so the questions
 * those words raise are asked of this answer. A table standing one target has no sibling to spread
 * to, no turn to rotate, and nothing to cool, so every one of those questions answers itself.
 */
export function routerTheEntryStands(routing: EngineRouting): EngineRouter | undefined {
  const entry = entryNodeOf(routing);

  return entry?.kind === 'router' ? entry : undefined;
}
