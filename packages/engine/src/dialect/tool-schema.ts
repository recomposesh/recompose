import type { HubJsonObject, HubToolSchema } from './hub';

const coreFields = new Set(['type', 'properties', 'required']);

function isJsonObject(value: unknown): value is HubJsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requiredFrom(value: unknown): readonly string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;
}

function schemaMetadata(schema: HubJsonObject): HubJsonObject {
  return Object.fromEntries(Object.entries(schema).filter(([key]) => !coreFields.has(key)));
}

function declaredTypeName(key: string, value: unknown): string | undefined {
  return key === 'type' && typeof value === 'string' ? value : undefined;
}

function normalizedEntry([key, value]: [string, unknown]): [string, unknown] {
  const declared = declaredTypeName(key, value);

  return [key, declared === undefined ? normalizedSchemaValue(value) : declared.toLowerCase()];
}

function normalizedSchemaValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizedSchemaValue);
  if (!isJsonObject(value)) return value;

  return Object.fromEntries(Object.entries(value).map(normalizedEntry));
}

function normalizedSchema(schema: HubJsonObject): HubJsonObject {
  return Object.fromEntries(Object.entries(schema).map(normalizedEntry));
}

function entryIsNormalized([key, value]: [string, unknown]): boolean {
  const declared = declaredTypeName(key, value);

  return declared === undefined
    ? schemaTypesAreNormalized(value)
    : declared === declared.toLowerCase();
}

function schemaTypesAreNormalized(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(schemaTypesAreNormalized);
  if (!isJsonObject(value)) return true;

  return Object.entries(value).every(entryIsNormalized);
}

function providerSchemaIsCanonical(schema: HubToolSchema): boolean {
  return (
    schema['$schema'] === undefined &&
    schema['additionalProperties'] === false &&
    schemaTypesAreNormalized(schema)
  );
}

export function hubToolSchemaFrom(schema: HubJsonObject | undefined): HubToolSchema {
  const source = schema ?? {};
  const properties = isJsonObject(source['properties']) ? source['properties'] : {};
  const required = requiredFrom(source['required']);

  return {
    ...schemaMetadata(source),
    type: 'object',
    properties,
    ...(required === undefined ? {} : { required }),
  };
}

/**
 * Whether a value is an object schema, which is the only thing strictness has anything to say to.
 *
 * @summary A schema declares `type: 'object'` and holds its fields under `properties`. Anything
 * else, a string, an array of numbers, an enum, has no extra properties to refuse.
 */
function isObjectSchema(value: unknown): value is HubJsonObject {
  return isJsonObject(value) && value['type'] === 'object';
}

/**
 * Every object inside a schema, made to refuse extra properties the way the outermost one does.
 *
 * @summary A provider running structured output strictly demands `additionalProperties: false` on
 * every object, not only the one at the top. Setting it once left a schema whose nested objects
 * still accepted anything, which either fails the provider's own validation or lets a field
 * through that the tool never declared.
 *
 * A nested object that already answers the question keeps its answer, so a tool deliberately
 * allowing extras somewhere inside is not overruled here.
 */
function strictlyNested(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strictlyNested);
  if (!isJsonObject(value)) return value;

  const walked = eachValueStrictlyNested(value);

  return isObjectSchema(walked) && walked['additionalProperties'] === undefined
    ? { ...walked, additionalProperties: false }
    : walked;
}

function eachValueStrictlyNested(held: HubJsonObject): HubJsonObject {
  return Object.fromEntries(
    Object.entries(held).map(([key, nested]) => [key, strictlyNested(nested)]),
  );
}

export function strictProviderToolSchema(schema: HubToolSchema): HubToolSchema {
  if (providerSchemaIsCanonical(schema)) return schema;

  const source = normalizedSchema(schema);

  const metadata = Object.fromEntries(
    Object.entries(source).filter(
      ([key]) =>
        key !== '$schema' &&
        key !== 'title' &&
        key !== 'type' &&
        key !== 'properties' &&
        key !== 'required',
    ),
  );
  const declared = isJsonObject(source['properties']) ? source['properties'] : {};
  const properties = eachValueStrictlyNested(declared);
  const required = requiredFrom(source['required'])?.filter((name) => name in properties);

  return {
    ...metadata,
    type: 'object',
    properties,
    ...(required === undefined ? {} : { required }),
    additionalProperties: false,
  };
}

export function anthropicToolSchema(schema: HubToolSchema): HubToolSchema {
  const source = normalizedSchema(schema);
  const additional = source['additionalProperties'];
  const declaredSchema = source['$schema'];

  return {
    ...source,
    type: 'object',
    properties: isJsonObject(source['properties']) ? source['properties'] : {},
    ...anthropicAdditionalProperties(additional),
    ...anthropicSchemaDeclaration(declaredSchema),
  };
}

export function chatToolSchema(schema: HubToolSchema): HubToolSchema {
  return completedObjectSchema(schema);
}

function completedObjectSchema(schema: HubToolSchema): HubToolSchema {
  const completed = completedSchemaValue(schema);

  return isJsonObject(completed)
    ? {
        ...completed,
        type: 'object',
        properties: isJsonObject(completed['properties']) ? completed['properties'] : {},
      }
    : { type: 'object', properties: {} };
}

function completedSchemaValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(completedSchemaValue);
  if (!isJsonObject(value)) return value;

  const completed = Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, completedSchemaValue(nested)]),
  );

  return completed['type'] === 'object' && !isJsonObject(completed['properties'])
    ? { ...completed, properties: {} }
    : completed;
}

/**
 * What Anthropic is told about extra properties, which is what the tool said.
 *
 * @summary JSON Schema lets `additionalProperties` be a schema as well as a boolean: `{"type":
 * "string"}` means extras are allowed and must be strings. Reading that as `false` says the
 * opposite, so a tool that accepted extras stopped accepting them on the way across. A schema
 * passes through, a boolean passes through, and only a value no schema could mean is read as a
 * refusal, because guessing wider than the tool asked for is the one direction that costs safety.
 */
function anthropicAdditionalProperties(value: unknown): HubJsonObject {
  if (value === undefined) return {};

  const carried = typeof value === 'boolean' || isJsonObject(value) ? value : false;

  return { additionalProperties: carried };
}

function anthropicSchemaDeclaration(value: unknown): HubJsonObject {
  if (value === undefined) return {};

  return {
    $schema: typeof value === 'string' ? value : 'http://json-schema.org/draft-07/schema#',
  };
}

export function strictHubToolSchemaFrom(schema: HubJsonObject): HubToolSchema {
  if (schema['anyOf'] !== undefined || schema['oneOf'] !== undefined) {
    return {
      type: 'object',
      properties: isJsonObject(schema['properties']) ? schema['properties'] : {},
      additionalProperties: false,
    };
  }

  return strictProviderToolSchema(hubToolSchemaFrom(schema));
}
