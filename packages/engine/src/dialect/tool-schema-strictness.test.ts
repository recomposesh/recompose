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
