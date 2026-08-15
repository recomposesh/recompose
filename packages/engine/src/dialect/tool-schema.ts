import type { HubJsonObject, HubToolSchema } from './hub';

import {
  isJsonObject,
  normalizedSchema,
  requiredFrom,
  schemaTypesAreNormalized,
} from './tool-schema-normalize';

const coreFields = new Set(['type', 'properties', 'required']);
const rebuiltFields = new Set([...coreFields, '$schema', 'title']);
const definitionFields = new Set(['$defs', 'definitions']);

function schemaMetadata(schema: HubJsonObject): HubJsonObject {
  return Object.fromEntries(Object.entries(schema).filter(([key]) => !coreFields.has(key)));
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

/**
 * Everything the schema carries besides the fields rebuilt by name, its definitions made strict.
 *
 * @summary `$defs` and `definitions` hold subschemas a `$ref` names, so an object living there
 * reaches the provider exactly as an inline one does and owes the same refusal. Walking only the
 * root's `properties` left them untouched, which is a second way to hand a strict provider a
 * permissive object and one the canonical guard never had a chance to catch.
 */
function carriedMetadata(source: HubJsonObject): HubJsonObject {
  const carried: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (!rebuiltFields.has(key)) carried[key] = definitionsStrictlyNested(key, value);
  }

  return carried;
}

function definitionsStrictlyNested(key: string, value: unknown): unknown {
  return definitionFields.has(key) && isJsonObject(value) ? eachValueStrictlyNested(value) : value;
}

/**
 * Whether `strictlyNested` would hand this value straight back.
 *
 * @summary It mirrors `strictlyNested` clause for clause, so the two are read and changed
 * together. A question this side forgets to ask does not cost a needless rebuild, it skips a
 * repair that then never runs at all.
 */
function alreadyStrictlyNested(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(alreadyStrictlyNested);
  if (!isJsonObject(value)) return true;
  if (isObjectSchema(value) && value['additionalProperties'] === undefined) return false;

  return eachValueAlreadyStrictlyNested(value);
}

function eachValueAlreadyStrictlyNested(held: HubJsonObject): boolean {
  return Object.values(held).every(alreadyStrictlyNested);
}

function everySubschemaAlreadyStrictlyNested(
  source: HubJsonObject,
  declared: HubJsonObject,
): boolean {
  return eachValueAlreadyStrictlyNested(declared) && eachDefinitionAlreadyStrictlyNested(source);
}

function eachDefinitionAlreadyStrictlyNested(source: HubJsonObject): boolean {
  return Object.entries(source).every(
    ([key, value]) =>
      !definitionFields.has(key) || !isJsonObject(value) || eachValueAlreadyStrictlyNested(value),
  );
}

function requiredNeedsNoCleaning(schema: HubToolSchema, declared: HubJsonObject): boolean {
  const required = schema.required;

  if (required === undefined) return true;

  return requiredFrom(required)?.filter((name) => name in declared).length === required.length;
}

function providerSchemaRootIsCanonical(schema: HubToolSchema): boolean {
  return (
    schema['$schema'] === undefined &&
    schema['title'] === undefined &&
    schema['additionalProperties'] === false
  );
}

/**
 * Whether rebuilding this schema for a strict provider would give back what it was handed.
 *
 * @summary Every clause answers one thing `strictProviderToolSchema` would otherwise change, so
 * the predicate is only as true as its weakest question. Reading the root alone once let a
 * root-strict schema through untouched, which is the shape strict structured output asks clients
 * to send, so the nested repair never ran for the inputs most likely to need it.
 *
 * The order is load-bearing: `schemaTypesAreNormalized` must hold before the nested question is
 * asked, because that question reads `type` names as they stand and a schema still carrying
 * `OBJECT` would be judged on a name the rebuild is about to lowercase.
 */
function providerSchemaIsCanonical(schema: HubToolSchema): boolean {
  const declared = schema.properties;

  return (
    providerSchemaRootIsCanonical(schema) &&
    isJsonObject(declared) &&
    requiredNeedsNoCleaning(schema, declared) &&
    schemaTypesAreNormalized(schema) &&
    everySubschemaAlreadyStrictlyNested(schema, declared)
  );
}

export function strictProviderToolSchema(schema: HubToolSchema): HubToolSchema {
  if (providerSchemaIsCanonical(schema)) return schema;

  const source = normalizedSchema(schema);

  const metadata = carriedMetadata(source);
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
 * @summary A schema passes through and a boolean passes through, because reading `{"type":
 * "string"}` as `false` says the opposite of what the tool asked for. Normalization has already
 * turned an unreadable value into a refusal, at this depth and every other, so nothing is left to
 * decide here.
 */
function anthropicAdditionalProperties(value: unknown): HubJsonObject {
  return value === undefined ? {} : { additionalProperties: value };
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
