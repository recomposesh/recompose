import { describe, expect, test } from 'vitest';

import { engineRoutingSchema } from './engine-routing';

const bound = { kind: 'target', standing: { standing: 'bound', providerModel: 'gpt-5-mini' } };

const removed = { kind: 'target', standing: { standing: 'removed' } };

const failover = { kind: 'router', policy: { mode: 'failover' }, children: ['first', 'second'] };

const oneTarget = { entry: 'only', nodes: { only: bound } };

const ladder = {
  entry: 'ladder',
  nodes: { ladder: failover, first: bound, second: removed },
};

function aTableStanding(node: unknown): unknown {
  return { entry: 'only', nodes: { only: node } };
}

describe('the route table the parent mirrors to the child', () => {
  test('a direct binding crosses as the one-node table its entry names', () => {
    expect(engineRoutingSchema.parse(oneTarget)).toEqual(oneTarget);
  });

  test('a ladder crosses with its mode and its children in the order a person declared', () => {
    expect(engineRoutingSchema.parse(ladder)).toEqual(ladder);
  });

  test('a router a person renamed crosses wearing that name', () => {
    const named = aTableStanding({ ...failover, displayName: 'The ladder' });

    expect(engineRoutingSchema.parse(named)).toEqual(named);
  });

  test('a router holding no child crosses, because the refusal is the request-time answer', () => {
    const childless = aTableStanding({ ...failover, children: [] });

    expect(engineRoutingSchema.parse(childless)).toEqual(childless);
  });

  test('a round-robin router crosses beside the failover one', () => {
    const rotating = aTableStanding({ ...failover, policy: { mode: 'round-robin' } });

    expect(engineRoutingSchema.parse(rotating)).toEqual(rotating);
  });
});

describe('what the mirror refuses to carry', () => {
  test('a target naming the account paying for it is refused, so no custody crosses', () => {
    expect(() =>
      engineRoutingSchema.parse(aTableStanding({ ...bound, accountId: 'acc-1' })),
    ).toThrow();
  });

  test('a target carrying a credential under any name is refused', () => {
    for (const smuggled of [{ credential: 'sk-live-40d1' }, { key: 'sk-live-40d1' }]) {
      expect(() => engineRoutingSchema.parse(aTableStanding({ ...bound, ...smuggled }))).toThrow();
    }
  });

  test('a node the child cannot tell a target from a router by is refused', () => {
    for (const kind of ['pool', 'weighted', '']) {
      expect(() => engineRoutingSchema.parse(aTableStanding({ ...bound, kind }))).toThrow();
    }
  });

  test('a bound target naming no model is refused, because the request would carry no name', () => {
    const nameless = { kind: 'target', standing: { standing: 'bound', providerModel: '   ' } };

    expect(() => engineRoutingSchema.parse(aTableStanding(nameless))).toThrow();
  });

  test('a removed target naming a model is refused, because nothing stands behind the name', () => {
    const lingering = {
      kind: 'target',
      standing: { standing: 'removed', providerModel: 'gpt-5-mini' },
    };

    expect(() => engineRoutingSchema.parse(aTableStanding(lingering))).toThrow();
  });

  test('a router wearing a mode outside the two shipped is refused', () => {
    const guessed = aTableStanding({ ...failover, policy: { mode: 'weighted' } });

    expect(() => engineRoutingSchema.parse(guessed)).toThrow();
  });

  test('a router holding a blank child id is refused, because it names no route node', () => {
    const blank = aTableStanding({ ...failover, children: ['   '] });

    expect(() => engineRoutingSchema.parse(blank)).toThrow();
  });

  test('a table naming no entry is refused, because no request could start', () => {
    const { entry, ...withoutTheEntry } = oneTarget;

    expect(entry).toBe('only');
    expect(() => engineRoutingSchema.parse(withoutTheEntry)).toThrow();
  });

  test('a table keyed by a blank node id is refused', () => {
    expect(() => engineRoutingSchema.parse({ entry: 'only', nodes: { '   ': bound } })).toThrow();
  });

  test('a table carrying a field beside its entry and its nodes is refused', () => {
    expect(() =>
      engineRoutingSchema.parse({ ...oneTarget, policy: { mode: 'failover' } }),
    ).toThrow();
  });
});
