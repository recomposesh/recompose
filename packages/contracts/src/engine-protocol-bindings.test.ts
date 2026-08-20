import { describe, expect, test } from 'vitest';

import { engineGatewaySchema } from './engine-protocol';

function aRoutingStanding(standing: unknown): unknown {
  return { entry: 'only', nodes: { only: { kind: 'target', standing } } };
}

const binding = {
  id: 'fast',
  displayName: 'Fast',
  routing: aRoutingStanding({ standing: 'bound', providerModel: 'claude-sonnet-4-5' }),
};

const gateway = {
  slug: 'personal',
  displayName: 'Personal',
  port: 8397,
  virtualModels: [binding],
};

function aGatewayBindingLike(patch: Record<string, unknown>): unknown {
  return { ...gateway, virtualModels: [{ ...binding, ...patch }] };
}

function aGatewayBindingStanding(standing: unknown): unknown {
  return aGatewayBindingLike({ routing: aRoutingStanding(standing) });
}

describe('the binding snapshot the child answers listings from', () => {
  test('a binding names the virtual model, the name a listing prints, and the model it stands on', () => {
    expect(engineGatewaySchema.parse(gateway).virtualModels).toEqual([binding]);
  });

  test('a gateway carries every model it was handed, so a listing names them all', () => {
    const second = { ...binding, id: 'deep', displayName: 'Deep' };

    expect(
      engineGatewaySchema.parse({ ...gateway, virtualModels: [binding, second] }).virtualModels,
    ).toEqual([binding, second]);
  });

  test('a binding whose target left the registry stands removed', () => {
    const removed = aGatewayBindingStanding({ standing: 'removed' });

    expect(engineGatewaySchema.parse(removed)).toEqual(removed);
  });
});

describe('the standing that tells a bound target from a removed one', () => {
  test('a removed target names no model, because nothing stands behind the name', () => {
    const removedWithAModel = aGatewayBindingStanding({
      standing: 'removed',
      providerModel: 'claude-sonnet-4-5',
    });

    expect(() => engineGatewaySchema.parse(removedWithAModel)).toThrow();
  });

  test('a standing the child cannot tell bound from removed by is refused', () => {
    for (const standing of ['unknown', 'missing-target', '']) {
      const guessed = aGatewayBindingStanding({ standing });

      expect(() => engineGatewaySchema.parse(guessed)).toThrow();
    }
  });

  test('a bound target naming no model is refused, because the request would carry no name', () => {
    const nameless = aGatewayBindingStanding({ standing: 'bound', providerModel: '   ' });

    expect(() => engineGatewaySchema.parse(nameless)).toThrow();
  });
});

describe('what a binding refuses to carry', () => {
  test('a binding carries no credential, so the snapshot holds no secret', () => {
    for (const smuggled of [
      { credential: 'sk-ant-api03-9f2c' },
      { key: 'sk-ant-api03-9f2c' },
      { accountId: 'acc-1' },
    ]) {
      expect(() => engineGatewaySchema.parse(aGatewayBindingLike(smuggled))).toThrow();
    }
  });

  test('a virtual model wearing the dots a real model name carries crosses to the child', () => {
    for (const id of ['claude-5.6-sol', 'gpt_5.6-sol', 'llama3.2']) {
      const dotted = aGatewayBindingLike({ id });

      expect(engineGatewaySchema.parse(dotted)).toEqual(dotted);
    }
  });

  test('a virtual name outside the shipped alias grammar is refused', () => {
    for (const id of ['Fast', 'fast model', '-fast', 'fast.', '_fast']) {
      expect(() => engineGatewaySchema.parse(aGatewayBindingLike({ id }))).toThrow();
    }
  });

  test('a nameless binding is refused, because the listing prints the name', () => {
    expect(() => engineGatewaySchema.parse(aGatewayBindingLike({ displayName: '   ' }))).toThrow();
  });

  test('a binding carries no weight, because no shipped mode reads a share', () => {
    expect(() => engineGatewaySchema.parse(aGatewayBindingLike({ weight: 100 }))).toThrow();
  });

  test('a routing that is no table at all is refused, so a bare node cannot stand in for one', () => {
    expect(() =>
      engineGatewaySchema.parse(aGatewayBindingLike({ routing: { kind: 'router' } })),
    ).toThrow();
  });
});
