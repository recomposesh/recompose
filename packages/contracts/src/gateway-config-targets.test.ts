import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import { GATEWAY_CONFIG_VERSION, gatewayConfigSchema } from './gateway-config';
import { ROUTER_DEPTH_LIMIT, routingSchema } from './gateway-routing';

type Refusal = { code: string; path: PropertyKey[]; message: string };

const ENTRY = 'node-one';

function targetNode(accountId: string): Record<string, unknown> {
  return { kind: 'target', accountId, providerModel: 'a-real-model' };
}

function failoverOver(children: readonly string[]): Record<string, unknown> {
  return { kind: 'router', policy: { mode: 'failover' }, children };
}

function bindingOn(id: string, accountId: string): Record<string, unknown> {
  return {
    id,
    displayName: 'Bound',
    routing: { entry: ENTRY, nodes: { [ENTRY]: targetNode(accountId) } },
  };
}

function configHolding(virtualModels: readonly Record<string, unknown>[]): Record<string, unknown> {
  return {
    schemaVersion: GATEWAY_CONFIG_VERSION,
    slug: 'my-gateway',
    displayName: 'My Gateway',
    port: 8397,
    virtualModels,
    layout: { nodes: { gateway: { x: 0, y: 0 } } },
  };
}

function parseRouting(routing: Record<string, unknown>) {
  return gatewayConfigSchema.parse(configHolding([{ id: 'fast', displayName: 'Bound', routing }]))
    .virtualModels[0]?.routing;
}

function refusalsFor(routing: Record<string, unknown>): Refusal[] {
  const parsed = routingSchema.safeParse(routing);

  return parsed.success
    ? []
    : parsed.error.issues.map(({ code, path, message }) => ({ code, path: [...path], message }));
}

function routersDeep(levels: number): Record<string, unknown> {
  const nodes: Record<string, unknown> = { leaf: targetNode('acc-openrouter') };
  let outermost = 'leaf';

  for (let level = levels; level > 0; level -= 1) {
    const id = `router-${String(level)}`;

    nodes[id] = failoverOver([outermost]);
    outermost = id;
  }

  return { entry: outermost, nodes };
}

describe('an account a virtual model may stand on', () => {
  test('a key account stands as the target the entry names', () => {
    const parsed = gatewayConfigSchema.parse(
      configHolding([bindingOn('fast', 'acc-anthropic-key')]),
    );

    expect(parsed.virtualModels[0]?.routing.nodes[ENTRY]).toEqual(targetNode('acc-anthropic-key'));
  });

  test('an aggregator account stands as the target the entry names', () => {
    const parsed = gatewayConfigSchema.parse(configHolding([bindingOn('fast', 'acc-openrouter')]));

    expect(parsed.virtualModels[0]?.routing.nodes[ENTRY]).toEqual(targetNode('acc-openrouter'));
  });

  test('a local runtime stands as the target the entry names', () => {
    const parsed = gatewayConfigSchema.parse(configHolding([bindingOn('fast', 'acc-ollama')]));

    expect(parsed.virtualModels[0]?.routing.nodes[ENTRY]).toEqual(targetNode('acc-ollama'));
  });
});

describe('a subscription account standing as a target', () => {
  test('a config binds a virtual model to a subscription account', () => {
    const parsed = gatewayConfigSchema.parse(configHolding([bindingOn('fast', 'acc-claude-max')]));

    expect(parsed.virtualModels[0]?.routing.nodes[ENTRY]).toEqual(targetNode('acc-claude-max'));
  });

  test('a subscription can stand beside targets held under other account kinds', () => {
    const parsed = gatewayConfigSchema.parse(
      configHolding([bindingOn('fast', 'acc-openrouter'), bindingOn('deep', 'acc-claude-max')]),
    );

    expect(parsed.virtualModels.map((model) => model.routing.nodes[ENTRY])).toEqual([
      targetNode('acc-openrouter'),
      targetNode('acc-claude-max'),
    ]);
  });
});

describe('a target the registry can no longer resolve', () => {
  test('a binding onto an account that left the registry still stores', () => {
    const parsed = gatewayConfigSchema.parse(configHolding([bindingOn('fast', 'acc-removed')]));

    expect(parsed.virtualModels[0]?.routing.nodes[ENTRY]).toEqual(targetNode('acc-removed'));
  });

  test('a gateway holding no virtual model stores against an empty registry', () => {
    expect(gatewayConfigSchema.parse(configHolding([])).virtualModels).toEqual([]);
  });
});

describe('a router standing between a virtual model and its targets', () => {
  test('a router holds its children in the order a person declared them', () => {
    const routing = parseRouting({
      entry: 'ladder',
      nodes: {
        ladder: failoverOver(['first', 'second']),
        first: targetNode('acc-openrouter'),
        second: targetNode('acc-claude-max'),
      },
    });

    expect(routing?.nodes['ladder']).toEqual(failoverOver(['first', 'second']));
  });

  test('a router that spreads its requests stores the round-robin mode', () => {
    const spreading = { kind: 'router', policy: { mode: 'round-robin' }, children: ['first'] };
    const routing = parseRouting({
      entry: 'spread',
      nodes: { spread: spreading, first: targetNode('acc-openrouter') },
    });

    expect(routing?.nodes['spread']).toEqual(spreading);
  });

  test('a router wears the name a person gave it', () => {
    const named = { ...failoverOver(['first']), displayName: 'Ladder' };
    const routing = parseRouting({
      entry: 'ladder',
      nodes: { ladder: named, first: targetNode('acc-openrouter') },
    });

    expect(routing?.nodes['ladder']).toEqual(named);
  });

  test('a router holding no child stores, because an empty router refuses at request time', () => {
    const routing = parseRouting({ entry: 'ladder', nodes: { ladder: failoverOver([]) } });

    expect(routing?.nodes['ladder']).toEqual(failoverOver([]));
  });

  test('routers nest as deep as the bound allows', () => {
    expect(parseRouting(routersDeep(ROUTER_DEPTH_LIMIT))?.entry).toBe('router-1');
  });

  test('a mode no router ships is refused', () => {
    const weighted = { kind: 'router', policy: { mode: 'weighted' }, children: [] };

    expect(refusalsFor({ entry: 'ladder', nodes: { ladder: weighted } })).not.toEqual([]);
  });
});

describe('a routing naming what its table does not hold', () => {
  test('an entry naming no node is refused, and the refusal names the entry', () => {
    const stranded = { entry: 'nowhere', nodes: { [ENTRY]: targetNode('acc-openrouter') } };

    expect(refusalsFor(stranded)).toEqual([
      { code: 'custom', path: ['entry'], message: 'the entry nowhere names no node in the table' },
    ]);
  });

  test('a child no node answers to is refused, and the refusal names the child', () => {
    const dangling = { entry: 'ladder', nodes: { ladder: failoverOver(['ghost']) } };

    expect(refusalsFor(dangling)).toEqual([
      {
        code: 'custom',
        path: ['nodes', 'ladder', 'children'],
        message: 'child ghost names no node in the table',
      },
    ]);
  });
});

describe('a routing that is no tree standing on its entry', () => {
  test('an entry standing as its own descendant is refused, and the refusal names it', () => {
    const looping = {
      entry: 'first',
      nodes: { first: failoverOver(['second']), second: failoverOver(['first']) },
    };

    expect(refusalsFor(looping)).toEqual([
      { code: 'custom', path: ['entry'], message: 'the entry first also stands as a child' },
    ]);
  });

  test('two routers claiming one child is refused, and the refusal names the child', () => {
    const shared = {
      entry: 'ladder',
      nodes: {
        ladder: failoverOver(['left', 'right']),
        left: failoverOver(['claimed']),
        right: failoverOver(['claimed']),
        claimed: targetNode('acc-openrouter'),
      },
    };

    expect(refusalsFor(shared)).toEqual([
      {
        code: 'custom',
        path: ['nodes', 'claimed'],
        message: 'node claimed answers to more than one parent',
      },
    ]);
  });

  test('a node the entry never reaches is refused, and the refusal names the node', () => {
    const orphaned = {
      entry: ENTRY,
      nodes: { [ENTRY]: targetNode('acc-openrouter'), forgotten: targetNode('acc-claude-max') },
    };

    expect(refusalsFor(orphaned)).toEqual([
      {
        code: 'custom',
        path: ['nodes', 'forgotten'],
        message: 'node forgotten stands unreachable from the entry',
      },
    ]);
  });
});

describe('the depth bound holds however deep a person nests', () => {
  test('routers nesting past the bound are refused, and the refusal names the deepest', () => {
    expect(refusalsFor(routersDeep(ROUTER_DEPTH_LIMIT + 1))).toEqual([
      {
        code: 'custom',
        path: ['nodes', 'router-5'],
        message: 'router-5 stands past 4 nested routers',
      },
    ]);
  });

  test.prop([fc.integer({ min: 1, max: ROUTER_DEPTH_LIMIT })])(
    'any nesting within the bound stores',
    (levels) => {
      expect(parseRouting(routersDeep(levels))?.entry).toBe('router-1');
    },
  );

  test.prop([fc.integer({ min: ROUTER_DEPTH_LIMIT + 1, max: 12 })])(
    'any nesting past the bound is refused where it first stands too deep',
    (levels) => {
      const [first] = refusalsFor(routersDeep(levels));

      expect(first?.path).toEqual(['nodes', `router-${String(ROUTER_DEPTH_LIMIT + 1)}`]);
    },
  );
});
