import type { GatewayConfig } from '@recompose/contracts';
import type { Edge, Node } from '@xyflow/react';

import type { CanvasWorld } from './canvas-standings';

/** Every write and every standing one Delete press left behind, in the order it made them. */
export type DeletionRecord = {
  asked: (string | undefined)[];
  released: GatewayConfig[];
};

function idleDefinition(record: DeletionRecord): CanvasWorld['define'] {
  return {
    mutate: (written) => {
      record.released.push(written);
    },
    mutateAsync: async (written) => {
      record.released.push(written);

      return Promise.resolve([]);
    },
    reset: () => {},
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    isError: false,
    isIdle: true,
    isPaused: false,
    isPending: false,
    isSuccess: false,
    status: 'idle',
    submittedAt: 0,
    variables: undefined,
    context: undefined,
  };
}

/**
 * A canvas world that records what a gesture asked and what it wrote, without a React tree.
 *
 * @summary The write never reports success, so a scenario reads the gateway a release would store
 * rather than the standings that would follow one landing: what a release costs is exactly the
 * definition it takes out, which is the reading the sibling-eating defect got wrong.
 */
export function worldOver(gateway: GatewayConfig): {
  world: CanvasWorld;
  record: DeletionRecord;
} {
  const record: DeletionRecord = { asked: [], released: [] };
  const world: CanvasWorld = {
    slug: gateway.slug,
    gateway,
    accounts: [],
    standings: {
      selection: undefined,
      picker: undefined,
      removing: undefined,
      announced: undefined,
      refusal: undefined,
      select: () => {},
      setPicker: () => {},
      movePendingTo: () => {},
      setRemoving: (nodeId) => {
        record.asked.push(nodeId);
      },
      announce: () => {},
      refuse: () => {},
    },
    graph: { nodes: [], edges: [] },
    seats: {},
    define: idleDefinition(record),
    dragging: { current: { inFlight: false, escaped: false } },
    view: { current: null },
  };

  return { world, record };
}

/** A card standing under one id, which is all a Delete press reads off it. */
export function card(id: string): Node {
  return { id, position: { x: 0, y: 0 }, data: {} };
}

/** A cable standing under one id, between the two cards its ends name. */
export function cable(id: string, source: string, target: string): Edge {
  return { id, source, target };
}
