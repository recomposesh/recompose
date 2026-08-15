import { describe, expect, it } from 'vitest';

import type { HubJsonObject } from './hub';

import { anthropicToolSchema, strictProviderToolSchema } from './tool-schema';

function isJsonObject(value: unknown): value is HubJsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** One named schema out of another, read the way the encoder writes it. */
function held(schema: HubJsonObject, key: string): HubJsonObject {
  const nested = schema[key];

  if (!isJsonObject(nested)) {
    throw new Error(`the schema carried nothing readable under ${key}`);
  }

  return nested;
}

function propertyOf(schema: HubJsonObject, name: string): HubJsonObject {
  return held(held(schema, 'properties'), name);
}

describe('what a nested object carries into a provider that demands strictness', () => {
  it('gives every nested object its own refusal of extra properties', () => {
    const strict = strictProviderToolSchema({
      type: 'object',
      properties: { where: { type: 'object', properties: { city: { type: 'string' } } } },
    });

    expect(propertyOf(strict, 'where')['additionalProperties']).toBe(false);
  });

  it('reaches an object nested inside an array of objects', () => {
    const strict = strictProviderToolSchema({
      type: 'object',
      properties: {
        stops: { type: 'array', items: { type: 'object', properties: { at: { type: 'string' } } } },
      },
    });

    expect(held(propertyOf(strict, 'stops'), 'items')['additionalProperties']).toBe(false);
  });

  it('reaches an object two levels down', () => {
    const strict = strictProviderToolSchema({
      type: 'object',
      properties: {
        where: {
          type: 'object',
          properties: { at: { type: 'object', properties: { city: { type: 'string' } } } },
        },
      },
    });

    expect(propertyOf(propertyOf(strict, 'where'), 'at')['additionalProperties']).toBe(false);
  });

  it('leaves a nested object that already refuses extras exactly as it stands', () => {
    const strict = strictProviderToolSchema({
      type: 'object',
      properties: {
        where: {
          type: 'object',
          properties: { city: { type: 'string' } },
          additionalProperties: false,
        },
      },
    });

    expect(propertyOf(strict, 'where')['additionalProperties']).toBe(false);
  });

  it('says nothing about a nested value that is not an object schema', () => {
    const strict = strictProviderToolSchema({
      type: 'object',
      properties: { city: { type: 'string' } },
    });

    expect(propertyOf(strict, 'city')).toEqual({ type: 'string' });
  });
});

describe('what a subschema defined once and referenced by name carries into a strict provider', () => {
  it('gives an object schema held under $defs its own refusal of extra properties', () => {
    const strict = strictProviderToolSchema({
      type: 'object',
      properties: { step: { $ref: '#/$defs/step' } },
      $defs: { step: { type: 'object', properties: { output: { type: 'string' } } } },
    });

    expect(held(held(strict, '$defs'), 'step')['additionalProperties']).toBe(false);
  });

  it('gives an object schema held under the draft-07 definitions spelling the same refusal', () => {
    const strict = strictProviderToolSchema({
      type: 'object',
      properties: { step: { $ref: '#/definitions/step' } },
      definitions: { step: { type: 'object', properties: { output: { type: 'string' } } } },
    });

    expect(held(held(strict, 'definitions'), 'step')['additionalProperties']).toBe(false);
  });
});

describe('what a schema already refusing extras at its root still gets cleaned of', () => {
  it('gives a nested object its own refusal, which the outermost refusal never granted it', () => {
    const strict = strictProviderToolSchema({
      type: 'object',
      additionalProperties: false,
      properties: { user: { type: 'object', properties: { name: { type: 'string' } } } },
    });

    expect(propertyOf(strict, 'user')['additionalProperties']).toBe(false);
  });

  it('still reaches a definition, which the root refusal hid behind the canonical guard', () => {
    const strict = strictProviderToolSchema({
      type: 'object',
      additionalProperties: false,
      properties: { step: { $ref: '#/$defs/step' } },
      $defs: { step: { type: 'object', properties: { output: { type: 'string' } } } },
    });

    expect(held(held(strict, '$defs'), 'step')['additionalProperties']).toBe(false);
  });

  it('drops a required name the schema never declared as a property', () => {
    const strict = strictProviderToolSchema({
      type: 'object',
      additionalProperties: false,
      properties: { country: { type: 'string' } },
      required: ['country', 'missing'],
    });

    expect(strict.required).toEqual(['country']);
  });

  it('drops the title, which is no part of what the provider is asked to fill in', () => {
    const strict = strictProviderToolSchema({
      type: 'object',
      additionalProperties: false,
      properties: {},
      title: 'remove me',
    });

    expect('title' in strict).toBe(false);
  });
});

describe('what a nested object carries into Anthropic', () => {
  it('leaves a nested object saying nothing about extras still saying nothing', () => {
    const encoded = anthropicToolSchema({
      type: 'object',
      properties: { user: { type: 'object', properties: { name: { type: 'string' } } } },
    });

    expect('additionalProperties' in propertyOf(encoded, 'user')).toBe(false);
  });

  it('lets a nested object naming what extras must look like keep saying it', () => {
    const allowed = { type: 'string' };
    const encoded = anthropicToolSchema({
      type: 'object',
      properties: { user: { type: 'object', properties: {}, additionalProperties: allowed } },
    });

    expect(propertyOf(encoded, 'user')['additionalProperties']).toEqual(allowed);
  });

  it('lowercases a type name declared inside a nested object', () => {
    const encoded = anthropicToolSchema({
      type: 'object',
      properties: { user: { type: 'OBJECT', properties: { name: { type: 'STRING' } } } },
    });

    expect(propertyOf(propertyOf(encoded, 'user'), 'name')['type']).toBe('string');
  });
});

describe('what Anthropic is told about extra properties', () => {
  it('a schema naming what extras must look like keeps saying it', () => {
    const allowed = { type: 'string' };
    const encoded = anthropicToolSchema({
      type: 'object',
      properties: {},
      additionalProperties: allowed,
    });

    expect(encoded['additionalProperties']).toEqual(allowed);
  });

  it('a schema allowing any extra still allows any extra', () => {
    const encoded = anthropicToolSchema({
      type: 'object',
      properties: {},
      additionalProperties: true,
    });

    expect(encoded['additionalProperties']).toBe(true);
  });

  it('a schema refusing extras still refuses them', () => {
    const encoded = anthropicToolSchema({
      type: 'object',
      properties: {},
      additionalProperties: false,
    });

    expect(encoded['additionalProperties']).toBe(false);
  });

  it('a value no schema could mean is read as refusing extras', () => {
    const encoded = anthropicToolSchema({
      type: 'object',
      properties: {},
      additionalProperties: 'yes',
    });

    expect(encoded['additionalProperties']).toBe(false);
  });

  it('a schema saying nothing about extras still says nothing', () => {
    const encoded = anthropicToolSchema({ type: 'object', properties: {} });

    expect('additionalProperties' in encoded).toBe(false);
  });
});
