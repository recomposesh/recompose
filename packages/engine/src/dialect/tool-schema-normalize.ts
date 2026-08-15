import type { HubJsonObject } from './hub';

export function isJsonObject(value: unknown): value is HubJsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function requiredFrom(value: unknown): readonly string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;
}

function declaredTypeName(key: string, value: unknown): string | undefined {
  return key === 'type' && typeof value === 'string' ? value : undefined;
}

/**
 * Whether a value could be what JSON Schema means by `additionalProperties`.
 *
 * @summary The keyword takes a schema as well as a boolean: `{"type": "string"}` allows extras and
 * demands they be strings. Anything else says nothing a provider can act on, and the safe reading
 * of an unreadable value is a refusal, because guessing wider than the tool asked for is the one
 * direction that costs safety. The Anthropic encoder once read the root this way while every depth
 * below it read the value literally, so one schema carried two readings of the same garbage.
 */
function extrasAreReadable(value: unknown): boolean {
  return typeof value === 'boolean' || isJsonObject(value);
}

function normalizedEntry([key, value]: [string, unknown]): [string, unknown] {
  const declared = declaredTypeName(key, value);

  if (declared !== undefined) return [key, declared.toLowerCase()];
  if (key === 'additionalProperties' && !extrasAreReadable(value)) return [key, false];

  return [key, normalizedSchemaValue(value)];
}

function normalizedSchemaValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizedSchemaValue);
  if (!isJsonObject(value)) return value;

  return Object.fromEntries(Object.entries(value).map(normalizedEntry));
}

export function normalizedSchema(schema: HubJsonObject): HubJsonObject {
  return Object.fromEntries(Object.entries(schema).map(normalizedEntry));
}

/**
 * Whether `normalizedSchema` would hand this entry straight back.
 *
 * @summary It mirrors `normalizedEntry` question for question, so the two are read and changed
 * together. Every caller that skips work on the strength of this answer skips the repair along
 * with it, so a question missing here is a repair that silently never runs.
 */
function entryIsNormalized([key, value]: [string, unknown]): boolean {
  const declared = declaredTypeName(key, value);

  if (declared !== undefined) return declared === declared.toLowerCase();
  if (key === 'additionalProperties' && !extrasAreReadable(value)) return false;

  return schemaTypesAreNormalized(value);
}

export function schemaTypesAreNormalized(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(schemaTypesAreNormalized);
  if (!isJsonObject(value)) return true;

  return Object.entries(value).every(entryIsNormalized);
}
