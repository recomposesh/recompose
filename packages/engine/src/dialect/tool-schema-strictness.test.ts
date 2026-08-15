import { describe, expect, it } from 'vitest';

import {
  anthropicToolSchema,
  strictHubToolSchemaFrom,
  strictProviderToolSchema,
} from './tool-schema';
import { held, propertyOf } from './tool-schema.testkit';

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

  it('invents no required list for a schema that named none', () => {
    const strict = strictProviderToolSchema({
      type: 'object',
      additionalProperties: false,
      properties: { country: { type: 'string' } },
    });

    expect('required' in strict).toBe(false);
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

describe('where the canonical guard stopped looking behind a root that already refused', () => {
  it('reaches an object listed among the shapes a property may take', () => {
    const strict = strictProviderToolSchema({
      type: 'object',
      additionalProperties: false,
      properties: {
        choice: { anyOf: [{ type: 'string' }, { type: 'object', properties: { at: {} } }] },
      },
    });

    const shapes = propertyOf(strict, 'choice')['anyOf'];

    expect(shapes).toContainEqual(
      expect.objectContaining({ type: 'object', additionalProperties: false }),
    );
  });

  it('reaches the one nested object that fell short, beside a sibling that did not', () => {
    const strict = strictProviderToolSchema({
      type: 'object',
      additionalProperties: false,
      properties: {
        settled: { type: 'object', properties: {}, additionalProperties: false },
        open: { type: 'object', properties: { name: { type: 'string' } } },
      },
    });

    expect(propertyOf(strict, 'open')['additionalProperties']).toBe(false);
  });
});

describe('what a root offering a union of shapes carries into a strict provider', () => {
  function unionRootedSchema() {
    return {
      anyOf: [{ required: ['step'] }, { required: ['note'] }],
      type: 'object',
      properties: { step: { $ref: '#/$defs/step' } },
      $defs: { step: { type: 'object', properties: { output: { type: 'string' } } } },
    };
  }

  it('keeps the definition its properties refer to by name', () => {
    const strict = strictHubToolSchemaFrom(unionRootedSchema());

    expect(held(held(strict, '$defs'), 'step')['properties']).toEqual({
      output: { type: 'string' },
    });
  });

  it('gives that definition the refusal every other object schema gets', () => {
    const strict = strictHubToolSchemaFrom(unionRootedSchema());

    expect(held(held(strict, '$defs'), 'step')['additionalProperties']).toBe(false);
  });

  it('drops the union the provider refuses to read at a root', () => {
    const strict = strictHubToolSchemaFrom(unionRootedSchema());

    expect('anyOf' in strict).toBe(false);
  });

  it('drops the exclusive spelling of that union too', () => {
    const strict = strictHubToolSchemaFrom({
      oneOf: [{ required: ['step'] }],
      type: 'object',
      properties: { step: { type: 'string' } },
    });

    expect('oneOf' in strict).toBe(false);
  });
});

describe('what a nested answer about extras that no schema could mean becomes', () => {
  it('reaches Anthropic as a refusal, the reading its root has always had', () => {
    const encoded = anthropicToolSchema({
      type: 'object',
      properties: { user: { type: 'object', properties: {}, additionalProperties: 'yes' } },
    });

    expect(propertyOf(encoded, 'user')['additionalProperties']).toBe(false);
  });

  it('reaches a strict provider as a refusal, though the root looked canonical', () => {
    const strict = strictProviderToolSchema({
      type: 'object',
      additionalProperties: false,
      properties: { user: { type: 'object', properties: {}, additionalProperties: 'yes' } },
    });

    expect(propertyOf(strict, 'user')['additionalProperties']).toBe(false);
  });
});
