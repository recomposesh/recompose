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

function normalizedEntry([key, value]: [string, unknown]): [string, unknown] {
  const declared = declaredTypeName(key, value);

  return [key, declared === undefined ? normalizedSchemaValue(value) : declared.toLowerCase()];
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

  return declared === undefined
    ? schemaTypesAreNormalized(value)
    : declared === declared.toLowerCase();
}

export function schemaTypesAreNormalized(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(schemaTypesAreNormalized);
  if (!isJsonObject(value)) return true;

  return Object.entries(value).every(entryIsNormalized);
}
