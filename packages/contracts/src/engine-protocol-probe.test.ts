import { describe, expect, test } from 'vitest';

import { engineDirectiveSchema } from './engine-protocol';

const gateway = {
  slug: 'personal',
  displayName: 'Personal',
  port: 8397,
  virtualModels: [],
};

describe('the probe directive that asks a vendor about one stored key', () => {
  const probe = {
    kind: 'probe',
    id: 'd1',
    origin: 'https://api.anthropic.com',
    custody: { custody: 'provider-key', provider: 'anthropic', credential: 'sk-ant-api03-9f2c' },
  };

  test('a probe names where the key is spent and carries the key it asks about', () => {
    expect(engineDirectiveSchema.parse(probe)).toEqual(probe);
  });

  test('a vendor with no first-party header of its own is probed as a bearer', () => {
    const bearer = {
      ...probe,
      origin: 'https://api.deepseek.com',
      custody: { custody: 'bearer', provider: 'deepseek', credential: 'sk-deepseek-9f2c' },
    };

    expect(engineDirectiveSchema.parse(bearer)).toEqual(bearer);
  });

  test('a first-party custody naming a provider no header covers is refused', () => {
    const unknownVendor = { ...probe, custody: { ...probe.custody, provider: 'xai' } };

    expect(() => engineDirectiveSchema.parse(unknownVendor)).toThrow();
  });

  test('a probe carrying a blank key is refused, because it would ask about nothing', () => {
    const blank = { ...probe, custody: { ...probe.custody, credential: '   ' } };

    expect(() => engineDirectiveSchema.parse(blank)).toThrow();
  });

  test('a probe carrying no origin is refused, because it would ask nowhere', () => {
    const { origin, ...withoutTheOrigin } = probe;

    expect(origin).toBe('https://api.anthropic.com');
    expect(() => engineDirectiveSchema.parse(withoutTheOrigin)).toThrow();
  });

  test('a probe carries no gateway, because it serves no traffic', () => {
    expect(() => engineDirectiveSchema.parse({ ...probe, gateway })).toThrow();
  });

  test('a probe answering nobody is refused, because its verdict would reach no one', () => {
    const { id, ...withoutTheIdentifier } = probe;

    expect(id).toBe('d1');
    expect(() => engineDirectiveSchema.parse(withoutTheIdentifier)).toThrow();
  });
});
