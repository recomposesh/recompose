import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import {
  GATEWAY_CONFIG_VERSION,
  GATEWAY_PORT_RANGE,
  gatewayConfigSchema,
  loadGatewayConfig,
} from './gateway-config';

const boundTarget = {
  kind: 'target',
  accountId: 'acc-openrouter',
  providerModel: 'anthropic/claude-sonnet-5',
};

const SEAT = 'seat-one';

function bindingThrough(node: Record<string, unknown>): Record<string, unknown> {
  return { entry: SEAT, nodes: { [SEAT]: node } };
}

function modelNamed(
  id: string,
  displayName: string,
  node: Record<string, unknown>,
): Record<string, unknown> {
  return { id, displayName, routing: bindingThrough(node) };
}

const validConfig = {
  schemaVersion: GATEWAY_CONFIG_VERSION,
  slug: 'my-gateway',
  displayName: 'My Gateway',
  port: 8397,
  virtualModels: [modelNamed('fast', 'Fast', boundTarget)],
  layout: {
    nodes: { gateway: { x: 0, y: 0 }, fast: { x: 240, y: 0 } },
  },
};

describe('a virtual model bound to one target', () => {
  test('a canonical config parses and keeps its shape', () => {
    const parsed = gatewayConfigSchema.parse(validConfig);

    expect(parsed).toEqual(validConfig);
  });

  test('a binding names the account it spends and the real model it asks for', () => {
    const parsed = gatewayConfigSchema.parse(validConfig);

    expect(parsed.virtualModels[0]?.routing.nodes[SEAT]).toEqual({
      kind: 'target',
      accountId: 'acc-openrouter',
      providerModel: 'anthropic/claude-sonnet-5',
    });
  });

  test('a gateway holds several virtual models, each on its own target', () => {
    const twoModels = {
      ...validConfig,
      virtualModels: [
        modelNamed('fast', 'Fast', boundTarget),
        modelNamed('deep', 'Deep', { ...boundTarget, providerModel: 'gpt-5' }),
      ],
    };

    expect(gatewayConfigSchema.parse(twoModels).virtualModels).toHaveLength(2);
  });

  test('two virtual models can never share the client-facing model id', () => {
    const duplicated = {
      ...validConfig,
      virtualModels: [
        modelNamed('fast', 'Fast', boundTarget),
        modelNamed('fast', 'Faster', boundTarget),
      ],
    };

    expect(() => gatewayConfigSchema.parse(duplicated)).toThrow(/duplicate virtual model id/iu);
  });

  test('a gateway stores before any virtual model exists', () => {
    const bare = { ...validConfig, virtualModels: [] };

    expect(gatewayConfigSchema.parse(bare).virtualModels).toEqual([]);
  });

  test('a virtual model id may carry the dots a real model name uses', () => {
    const dotted = {
      ...validConfig,
      virtualModels: [modelNamed('claude-5.6-sol', 'Fast', boundTarget)],
    };

    expect(gatewayConfigSchema.parse(dotted).virtualModels[0]?.id).toBe('claude-5.6-sol');
  });
});

describe('the stored shape holds its ladder flat', () => {
  test('a routing that nests one node inside another is refused', () => {
    const nested = {
      ...validConfig,
      virtualModels: [
        {
          id: 'fast',
          displayName: 'Fast',
          routing: {
            kind: 'router',
            id: 'r1',
            mode: 'failover',
            children: [{ id: 't1', ...boundTarget }],
          },
        },
      ],
    };

    expect(() => gatewayConfigSchema.parse(nested)).toThrow();
  });

  test('a weight on a target is refused, because no shipped mode reads a share', () => {
    const weighted = {
      ...validConfig,
      virtualModels: [modelNamed('fast', 'Fast', { ...boundTarget, weight: 100 })],
    };

    expect(() => gatewayConfigSchema.parse(weighted)).toThrow();
  });

  test('a node table held as a list is refused', () => {
    const listed = {
      ...validConfig,
      virtualModels: [
        {
          id: 'fast',
          displayName: 'Fast',
          routing: { entry: SEAT, nodes: [boundTarget, boundTarget] },
        },
      ],
    };

    expect(() => gatewayConfigSchema.parse(listed)).toThrow();
  });
});

describe('a config with nowhere for a secret to hide', () => {
  test('secrets cannot hide in a config: unknown keys are rejected', () => {
    expect(() => gatewayConfigSchema.parse({ ...validConfig, apiKey: 'sk-oops' })).toThrow();
  });

  test('secrets cannot hide inside a target either', () => {
    const smuggled = {
      ...validConfig,
      virtualModels: [modelNamed('fast', 'Fast', { ...boundTarget, apiKey: 'sk-oops' })],
    };

    expect(() => gatewayConfigSchema.parse(smuggled)).toThrow();
  });
});

describe('a binding the gateway refuses to store', () => {
  test('a virtual model id that no client could send is rejected', () => {
    for (const bad of ['Fast Model', 'UPPER', '-lead', 'trail-', '.lead', 'trail.', '']) {
      const hostile = {
        ...validConfig,
        virtualModels: [modelNamed(bad, 'Fast', boundTarget)],
      };

      expect(() => gatewayConfigSchema.parse(hostile)).toThrow();
    }
  });

  test('a blank display name on a virtual model is rejected', () => {
    const blankName = {
      ...validConfig,
      virtualModels: [modelNamed('fast', '   ', boundTarget)],
    };

    expect(() => gatewayConfigSchema.parse(blankName)).toThrow();
  });

  test('a whitespace-only target accountId is rejected', () => {
    const blankAccountId = {
      ...validConfig,
      virtualModels: [modelNamed('fast', 'Fast', { ...boundTarget, accountId: '   ' })],
    };

    expect(() => gatewayConfigSchema.parse(blankAccountId)).toThrow();
  });

  test('a whitespace-only real model name is rejected', () => {
    const blankModel = {
      ...validConfig,
      virtualModels: [modelNamed('fast', 'Fast', { ...boundTarget, providerModel: '   ' })],
    };

    expect(() => gatewayConfigSchema.parse(blankModel)).toThrow();
  });

  test('invalid gateway slugs are rejected', () => {
    for (const bad of ['My Gateway', 'UPPER', '-lead', 'trail-', 'a--b', '']) {
      expect(() => gatewayConfigSchema.parse({ ...validConfig, slug: bad })).toThrow();
    }
  });

  test('a whitespace-only gateway display name is rejected', () => {
    expect(() => gatewayConfigSchema.parse({ ...validConfig, displayName: '   ' })).toThrow();
  });
});

describe('gateway config schema: layout node keys', () => {
  test('non-slug layout node keys are rejected', () => {
    for (const bad of ['My Node', 'UPPER', '_lead', '']) {
      const hostileLayout = {
        ...validConfig,
        layout: { nodes: { ...validConfig.layout.nodes, [bad]: { x: 0, y: 0 } } },
      };

      expect(() => gatewayConfigSchema.parse(hostileLayout)).toThrow();
    }
  });

  test('a __proto__ layout key can never enter a parsed config', () => {
    const hostileLayout = {
      ...validConfig,
      layout: { nodes: { ...validConfig.layout.nodes, ['__proto__']: { x: 0, y: 0 } } },
    };

    const parsed = gatewayConfigSchema.parse(hostileLayout);

    const nodesPrototype: unknown = Object.getPrototypeOf(parsed.layout.nodes);

    expect(Object.keys(parsed.layout.nodes)).toEqual(Object.keys(validConfig.layout.nodes));
    expect(nodesPrototype).not.toHaveProperty('x');
  });
});

const slugSegmentArb = fc.stringMatching(/^[a-z0-9]{1,6}$/);
const slugArb = fc
  .array(slugSegmentArb, { minLength: 1, maxLength: 4 })
  .map((segments) => segments.join('-'))
  .filter((slug) => !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(slug));

const trimmedDisplayNameArb = fc
  .string({ minLength: 1, maxLength: 40 })
  .map((value) => value.trim())
  .filter((value) => value.length > 0);

const routingArb = fc
  .record({
    entry: slugArb,
    accountId: slugArb,
    providerModel: fc.stringMatching(/^[a-z0-9][a-z0-9./-]{0,40}$/),
  })
  .map(({ entry, ...target }) => ({ entry, nodes: { [entry]: { kind: 'target', ...target } } }));

const configArb = fc.record({
  schemaVersion: fc.constant(GATEWAY_CONFIG_VERSION),
  slug: slugArb,
  displayName: trimmedDisplayNameArb,
  port: fc.integer({ min: GATEWAY_PORT_RANGE.min, max: GATEWAY_PORT_RANGE.max }),
  virtualModels: fc.array(
    fc.record({ id: slugArb, displayName: trimmedDisplayNameArb, routing: routingArb }),
    { minLength: 0, maxLength: 4 },
  ),
  layout: fc.record({
    nodes: fc.dictionary(
      slugArb,
      fc.record({
        x: fc.integer({ min: -10000, max: 10000 }),
        y: fc.integer({ min: -10000, max: 10000 }),
      }),
    ),
  }),
});

describe('gateway config round-trip', () => {
  test.prop([configArb])('any valid config survives serialize → parse identically', (config) => {
    const serialized = JSON.stringify(config);
    const deserialized: unknown = JSON.parse(serialized);
    const roundTripped = loadGatewayConfig(deserialized);

    expect(roundTripped).toEqual(config);
  });
});
