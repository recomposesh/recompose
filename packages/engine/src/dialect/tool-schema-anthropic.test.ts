import { describe, expect, it } from 'vitest';

import { anthropicToolSchema } from './tool-schema';
import { propertyOf } from './tool-schema.testkit';

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
