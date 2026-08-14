import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import { GATEWAY_CONFIG_VERSION, GATEWAY_PORT_RANGE, loadGatewayConfig } from './gateway-config';

const storedUnderVersionOne = {
  schemaVersion: 1,
  slug: 'my-gateway',
  displayName: 'My Gateway',
  port: 8397,
  virtualModels: [],
  layout: { nodes: { gateway: { x: 0, y: 0 } } },
};

function servedBindings(document: unknown): unknown[] {
  return loadGatewayConfig(document).virtualModels.map(
    (model) => model.routing.nodes[model.routing.entry],
  );
}

describe('a gateway stored before virtual models bound to one target', () => {
  test('the version stamp reads 4, so every shape before it has a version to come from', () => {
    expect(GATEWAY_CONFIG_VERSION).toBe(4);
  });

  test('a version 1 document loads at the version this build stores', () => {
    expect(loadGatewayConfig(storedUnderVersionOne).schemaVersion).toBe(4);
  });

  test('the restamp carries the gateway forward untouched, because it held no binding', () => {
    expect(loadGatewayConfig(storedUnderVersionOne)).toEqual({
      ...storedUnderVersionOne,
      schemaVersion: 4,
    });
  });

  test('a document already at version 4 loads unchanged', () => {
    const current = { ...storedUnderVersionOne, schemaVersion: 4 };

    expect(loadGatewayConfig(current)).toEqual(current);
  });

  test('a document from a version this build never learned is refused', () => {
    expect(() => loadGatewayConfig({ ...storedUnderVersionOne, schemaVersion: 99 })).toThrow(
      /newer/,
    );
  });

  test('a version 1 document the restamp cannot rescue still fails validation', () => {
    expect(() => loadGatewayConfig({ ...storedUnderVersionOne, slug: 'x!' })).toThrow();
  });
});

describe('a gateway stored before any of them could require a key', () => {
  const storedUnderVersionTwo = { ...storedUnderVersionOne, schemaVersion: 2 };

  test('a version 2 document loads at the version this build stores', () => {
    expect(loadGatewayConfig(storedUnderVersionTwo).schemaVersion).toBe(4);
  });

  test('the restamp adds no key, because no build before it could mint one', () => {
    expect(loadGatewayConfig(storedUnderVersionTwo)).toEqual({
      ...storedUnderVersionTwo,
      schemaVersion: 4,
    });
  });

  test('a gateway that requires its key stores the value beside the requirement', () => {
    const requiring = {
      ...storedUnderVersionOne,
      schemaVersion: 4,
      apiKey: { value: 'rc-local-abcdef', required: true },
    };

    expect(loadGatewayConfig(requiring)).toEqual(requiring);
  });

  test('a gateway that stores a key it no longer requires reads back holding it', () => {
    const holding = {
      ...storedUnderVersionOne,
      schemaVersion: 4,
      apiKey: { value: 'rc-local-abcdef', required: false },
    };

    expect(loadGatewayConfig(holding).apiKey).toEqual({
      value: 'rc-local-abcdef',
      required: false,
    });
  });

  test('a requirement standing on no key is not a shape this build stores', () => {
    expect(() =>
      loadGatewayConfig({
        ...storedUnderVersionOne,
        schemaVersion: 4,
        apiKey: { required: true },
      }),
    ).toThrow();
  });

  test('a blank key is not a shape this build stores', () => {
    expect(() =>
      loadGatewayConfig({
        ...storedUnderVersionOne,
        schemaVersion: 4,
        apiKey: { value: '  ', required: true },
      }),
    ).toThrow();
  });
});

const boundDirectly = {
  ...storedUnderVersionOne,
  schemaVersion: 3,
  virtualModels: [
    {
      id: 'fast',
      displayName: 'Fast',
      target: { accountId: 'acc-openrouter', providerModel: 'anthropic/claude-sonnet-5' },
    },
    {
      id: 'deep',
      displayName: 'Deep',
      target: { accountId: 'acc-claude-max', providerModel: 'claude-opus-5' },
    },
  ],
};

describe('a gateway stored while a virtual model could bind only one target', () => {
  test('a version 3 document loads at the version this build stores', () => {
    expect(loadGatewayConfig(boundDirectly).schemaVersion).toBe(4);
  });

  test('the stored target becomes the one node its entry names', () => {
    const [fast] = loadGatewayConfig(boundDirectly).virtualModels;

    expect(fast?.routing.nodes).toEqual({
      [String(fast?.routing.entry)]: {
        kind: 'target',
        accountId: 'acc-openrouter',
        providerModel: 'anthropic/claude-sonnet-5',
      },
    });
  });

  test('every virtual model serves the same account and provider model it served before', () => {
    expect(servedBindings(boundDirectly)).toEqual([
      { kind: 'target', accountId: 'acc-openrouter', providerModel: 'anthropic/claude-sonnet-5' },
      { kind: 'target', accountId: 'acc-claude-max', providerModel: 'claude-opus-5' },
    ]);
  });

  test('a stored gateway that climbs the whole ladder from version 2 serves the same targets', () => {
    const storedUnderVersionTwo = { ...boundDirectly, schemaVersion: 2 };

    expect(servedBindings(storedUnderVersionTwo)).toEqual(servedBindings(boundDirectly));
  });
});

describe('the rewrite that carried a stored binding into its graph', () => {
  test('no two virtual models are handed the same route node id', () => {
    const entries = loadGatewayConfig(boundDirectly).virtualModels.map(
      (model) => model.routing.entry,
    );

    expect(new Set(entries).size).toBe(2);
  });

  test('the rewrite carries everything beyond the bindings through untouched', () => {
    const loaded = loadGatewayConfig(boundDirectly);

    expect({ ...loaded, virtualModels: [] }).toEqual({
      ...storedUnderVersionOne,
      schemaVersion: 4,
    });
  });

  test('a stored gateway holding no list of bindings still fails validation', () => {
    const malformed = { ...boundDirectly, virtualModels: 'fast' };

    expect(() => loadGatewayConfig(malformed)).toThrow();
  });

  test('a binding the rewrite cannot read reaches the shape whole, and the shape refuses it', () => {
    const blankAccount = {
      ...boundDirectly,
      virtualModels: [{ id: 'fast', displayName: 'Fast', target: { accountId: '  ' } }],
    };

    expect(() => loadGatewayConfig(blankAccount)).toThrow(/routing/u);
  });

  test('a binding already standing in a graph passes through the rewrite untouched', () => {
    const alreadyGraphed = {
      ...boundDirectly,
      virtualModels: [
        {
          id: 'fast',
          displayName: 'Fast',
          routing: {
            entry: 'seat',
            nodes: { seat: { kind: 'target', accountId: 'acc-ollama', providerModel: 'qwen3' } },
          },
        },
      ],
    };

    expect(servedBindings(alreadyGraphed)).toEqual([
      { kind: 'target', accountId: 'acc-ollama', providerModel: 'qwen3' },
    ]);
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

const layoutArb = fc.record({
  nodes: fc.dictionary(
    slugArb,
    fc.record({
      x: fc.integer({ min: -10000, max: 10000 }),
      y: fc.integer({ min: -10000, max: 10000 }),
    }),
  ),
});

const versionOneDocumentArb = fc.record({
  schemaVersion: fc.constant(1),
  slug: slugArb,
  displayName: trimmedDisplayNameArb,
  port: fc.integer({ min: GATEWAY_PORT_RANGE.min, max: GATEWAY_PORT_RANGE.max }),
  virtualModels: fc.constant([]),
  layout: layoutArb,
});

const directBindingArb = fc.record({
  id: slugArb,
  displayName: trimmedDisplayNameArb,
  target: fc.record({
    accountId: slugArb,
    providerModel: fc.stringMatching(/^[a-z0-9][a-z0-9./-]{0,40}$/),
  }),
});

const versionThreeDocumentArb = fc.record({
  schemaVersion: fc.constant(3),
  slug: slugArb,
  displayName: trimmedDisplayNameArb,
  port: fc.integer({ min: GATEWAY_PORT_RANGE.min, max: GATEWAY_PORT_RANGE.max }),
  virtualModels: fc
    .uniqueArray(directBindingArb, { selector: (binding) => binding.id, maxLength: 4 })
    .map((bindings) => bindings),
  layout: layoutArb,
});

describe('the restamp holds for every gateway a shipped build ever wrote', () => {
  test.prop([versionOneDocumentArb])(
    'any stored version 1 document loads at the version this build stores',
    (document) => {
      const loaded = loadGatewayConfig(document);

      expect(loaded).toEqual({ ...document, schemaVersion: GATEWAY_CONFIG_VERSION });
    },
  );

  test.prop([versionOneDocumentArb])(
    'no restamp ever invents a key for a gateway that never held one',
    (document) => {
      expect(loadGatewayConfig(document).apiKey).toBeUndefined();
    },
  );

  test.prop([versionThreeDocumentArb])(
    'any stored direct target still serves its account and provider model after the rewrite',
    (document) => {
      expect(servedBindings(document)).toEqual(
        document.virtualModels.map((binding) => ({ kind: 'target', ...binding.target })),
      );
    },
  );
});
