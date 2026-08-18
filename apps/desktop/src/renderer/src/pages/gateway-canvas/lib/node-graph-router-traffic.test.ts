import type { GatewayConfig, GatewayTraffic, VirtualModel } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { A_MINUTE_LATER, cableIn, codex, graphAt, JUST_AFTER } from './node-graph-traffic.testkit';

const routed: VirtualModel = {
  id: 'fast',
  displayName: 'Fast',
  routing: {
    entry: 'ladder',
    nodes: {
      ladder: { kind: 'router', policy: { mode: 'failover' }, children: ['first', 'second'] },
      first: { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' },
      second: { kind: 'target', accountId: 'a1', providerModel: 'claude-opus-5' },
    },
  },
};

const overARouter: GatewayConfig = { ...codex, virtualModels: [routed] };

const REFUSED = 'The target is turning requests away for now.';

const throughTheSecond: GatewayTraffic = {
  codex: { fast: { second: { outcome: 'served', at: 1_754_600_000_000 } } },
};

const throughTheFirst: GatewayTraffic = {
  codex: { fast: { first: { outcome: 'served', at: 1_754_600_000_000 } } },
};

const movedOn: GatewayTraffic = {
  codex: {
    fast: {
      first: { outcome: 'failed', at: 1_754_600_000_000, status: 429, detail: REFUSED },
      second: { outcome: 'served', at: 1_754_600_000_001 },
    },
  },
};

describe('what the cables of a routed virtual model carry', () => {
  test('a cable below the router carries the traffic named against its own route node', () => {
    const graph = graphAt(throughTheSecond, JUST_AFTER, overARouter);

    expect(cableIn(graph, 'cable:fast:second')?.standing).toBe('served');
  });

  test('the cable into the router carries the newest reading among the nodes below it', () => {
    const graph = graphAt(throughTheSecond, JUST_AFTER, overARouter);

    expect(cableIn(graph, 'cable:fast')?.standing).toBe('served');
  });

  test('a request still in flight below the router paints the cable into it live', () => {
    const inFlight: GatewayTraffic = {
      codex: { fast: { second: { outcome: 'live', at: 1_754_600_000_000 } } },
    };
    const graph = graphAt(inFlight, JUST_AFTER, overARouter);

    expect(cableIn(graph, 'cable:fast')?.standing).toBe('live');
  });

  test('a walk that moved on paints the cable into the router with the reading that answered', () => {
    const graph = graphAt(movedOn, JUST_AFTER, overARouter);

    expect(cableIn(graph, 'cable:fast')?.standing).toBe('served');
  });

  test('the cable into the router cools back to rest with the readings below it', () => {
    const graph = graphAt(throughTheSecond, A_MINUTE_LATER, overARouter);

    expect(cableIn(graph, 'cable:fast')?.standing).toBe('resting');
  });

  test('a child no request reached rests while its sibling carries what flowed', () => {
    const graph = graphAt(throughTheSecond, JUST_AFTER, overARouter);

    expect(cableIn(graph, 'cable:fast:first')?.standing).toBe('resting');
  });

  test('one request that moved on from a child paints both cables, each with its own reading', () => {
    const graph = graphAt(movedOn, JUST_AFTER, overARouter);

    expect(cableIn(graph, 'cable:fast:first')?.standing).toBe('failed');
    expect(cableIn(graph, 'cable:fast:second')?.standing).toBe('served');
  });

  test('a request the first child answered leaves the child below it resting', () => {
    const graph = graphAt(throughTheFirst, JUST_AFTER, overARouter);

    expect(cableIn(graph, 'cable:fast:first')?.standing).toBe('served');
    expect(cableIn(graph, 'cable:fast:second')?.standing).toBe('resting');
    expect(cableIn(graph, 'wire:model:fast')?.standing).toBe('served');
  });
});

describe('what a routed virtual model hands a person to read', () => {
  test('the child that turned the request away stands its error on its own cable and no other', () => {
    const graph = graphAt(movedOn, JUST_AFTER, overARouter);

    expect(cableIn(graph, 'cable:fast:first')?.failure).toEqual({ status: 429, detail: REFUSED });
    expect(cableIn(graph, 'cable:fast:second')?.failure).toBeUndefined();
    expect(cableIn(graph, 'cable:fast')?.failure).toBeUndefined();
  });

  test('the gateway wire of a routed model paints with the newest reading across its nodes', () => {
    const graph = graphAt(movedOn, JUST_AFTER, overARouter);

    expect(cableIn(graph, 'wire:model:fast')?.standing).toBe('served');
  });
});

const nestedLadders: VirtualModel = {
  id: 'fast',
  displayName: 'Fast',
  routing: {
    entry: 'outer',
    nodes: {
      outer: { kind: 'router', policy: { mode: 'failover' }, children: ['inner'] },
      inner: { kind: 'router', policy: { mode: 'failover' }, children: ['leaf'] },
      leaf: { kind: 'target', accountId: 'a1', providerModel: 'claude-opus-5' },
    },
  },
};

const strandedBelowALadder: VirtualModel = {
  id: 'fast',
  displayName: 'Fast',
  routing: {
    entry: 'ladder',
    nodes: {
      ladder: { kind: 'router', policy: { mode: 'failover' }, children: ['first'] },
      first: { kind: 'target', accountId: 'gone', providerModel: 'claude-opus-5' },
    },
  },
};

describe('how a reading below travels up the routers above it', () => {
  test('one request paints every cable between the gateway and the child that answered', () => {
    const throughTheLeaf: GatewayTraffic = {
      codex: { fast: { leaf: { outcome: 'served', at: 1_754_600_000_000 } } },
    };
    const graph = graphAt(throughTheLeaf, JUST_AFTER, {
      ...codex,
      virtualModels: [nestedLadders],
    });

    expect(cableIn(graph, 'wire:model:fast')?.standing).toBe('served');
    expect(cableIn(graph, 'cable:fast')?.standing).toBe('served');
    expect(cableIn(graph, 'cable:fast:inner')?.standing).toBe('served');
    expect(cableIn(graph, 'cable:fast:leaf')?.standing).toBe('served');
  });

  test('a reading through a child whose account left paints nothing onto the router above it', () => {
    const throughTheStranded: GatewayTraffic = {
      codex: { fast: { first: { outcome: 'served', at: 1_754_600_000_000 } } },
    };
    const graph = graphAt(throughTheStranded, JUST_AFTER, {
      ...codex,
      virtualModels: [strandedBelowALadder],
    });

    expect(cableIn(graph, 'cable:fast')?.standing).toBe('resting');
    expect(cableIn(graph, 'cable:fast:first')?.standing).toBe('broken');
  });
});
