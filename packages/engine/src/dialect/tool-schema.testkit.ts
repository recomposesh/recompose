import type { HubJsonObject } from './hub';

function isJsonObject(value: unknown): value is HubJsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** One named schema out of another, read the way the encoder writes it. */
export function held(schema: HubJsonObject, key: string): HubJsonObject {
  const nested = schema[key];

  if (!isJsonObject(nested)) {
    throw new Error(`the schema carried nothing readable under ${key}`);
  }

  return nested;
}

export function propertyOf(schema: HubJsonObject, name: string): HubJsonObject {
  return held(held(schema, 'properties'), name);
}
