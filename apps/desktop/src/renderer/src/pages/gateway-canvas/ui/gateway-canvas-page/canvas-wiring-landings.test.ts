import { describe, expect, test } from 'vitest';

import { canvasGraph } from '../../lib/node-graph';
import { cableLandings, flowNodesOf } from './canvas-wiring';
import { gateway } from './canvas-wiring.testkit';

const asks = { onAddVirtualModel: () => {}, onBindFrom: () => {} };

function drawn() {
  return canvasGraph(gateway, [], { draft: undefined, pending: undefined });
}

function asksALanding(offered: unknown): offered is (from: string) => boolean {
  return typeof offered === 'function';
}

function takesCableFrom(nodeId: string, from: string): boolean | undefined {
  const seated = flowNodesOf(drawn(), {}, undefined, asks, cableLandings(gateway));
  const offered = seated.find((node) => node.id === nodeId)?.data['takesCableFrom'];

  return asksALanding(offered) ? offered(from) : undefined;
}

describe('the cards a cable in flight could land on', () => {
  test('a stored target takes a cable from a definition bound somewhere else', () => {
    expect(takesCableFrom('ghost:creative', 'model:fast')).toBe(true);
  });

  test('a stored target refuses a cable from the definition already answering through it', () => {
    expect(takesCableFrom('ghost:fast', 'model:fast')).toBe(false);
  });

  test('a card no cable can land on offers no answer at all, so nothing lights it', () => {
    expect(takesCableFrom('model:fast', 'model:creative')).toBeUndefined();
  });
});
