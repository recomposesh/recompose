import type { RouteNode, Routing } from '@recompose/contracts';

/** One account and the model it serves, as setup binds it. */
export type FirstTarget = { accountId: string; providerModel: string };

const ROUTER = 'router';

/**
 * The routing graph setup composes behind its first virtual model.
 *
 * @summary The router stands at the entry even over a single target, because a graph a person
 * extends by dropping a second source onto the router beats one they have to take apart first.
 * Every seat is named by its place rather than by its account, so re-running the build over the
 * same sources writes the same graph rather than a second one beside it.
 */
export function firstGraph(targets: readonly FirstTarget[]): Routing {
  const seats = targets.map((target, index) => ({
    id: `seat:${String(index + 1)}`,
    node: {
      kind: 'target' as const,
      accountId: target.accountId,
      providerModel: target.providerModel,
    },
  }));

  const nodes: Record<string, RouteNode> = {
    [ROUTER]: {
      kind: 'router',
      displayName: 'Round-robin',
      policy: { mode: 'round-robin' },
      children: seats.map((seat) => seat.id),
    },
  };

  for (const seat of seats) {
    nodes[seat.id] = seat.node;
  }

  return { entry: ROUTER, nodes };
}
