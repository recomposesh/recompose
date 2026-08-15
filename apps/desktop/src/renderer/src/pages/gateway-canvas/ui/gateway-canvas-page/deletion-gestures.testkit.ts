import type { GatewayConfig } from '@recompose/contracts';
import type { Edge, Node } from '@xyflow/react';

import type { CanvasWorld } from './canvas-standings';

import { worldWhereWritesHang } from './canvas-world.testkit';

/** Every write and every standing one Delete press left behind, in the order it made them. */
export type DeletionRecord = {
  asked: (string | undefined)[];
  released: GatewayConfig[];
};

/**
 * A canvas world that records what a Delete press asked and what it wrote, without a React tree.
 *
 * @summary The write never reports success, so a scenario reads the gateway a release would store
 * rather than the standings that would follow one landing: what a release costs is exactly the
 * definition it takes out, which is the reading the sibling-eating defect got wrong.
 */
export function worldOver(gateway: GatewayConfig): {
  world: CanvasWorld;
  record: DeletionRecord;
} {
  const { world, record } = worldWhereWritesHang(gateway);

  return { world, record: { asked: record.asked, released: record.written } };
}

/** A card standing under one id, which is all a Delete press reads off it. */
export function card(id: string): Node {
  return { id, position: { x: 0, y: 0 }, data: {} };
}

/** A cable standing under one id, between the two cards its ends name. */
export function cable(id: string, source: string, target: string): Edge {
  return { id, source, target };
}
