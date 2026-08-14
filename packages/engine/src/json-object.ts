export type JsonObject = Record<string, unknown>;

/**
 * Whether a value is a JSON object rather than an array or a bare value.
 *
 * @summary An array passes `typeof value === 'object'` and null passes it too, so both are ruled out
 * here once rather than at every reader. This sits below every wire module on purpose: the shape
 * readers and the wire itself both need it, and neither should have to import the other to get it.
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
