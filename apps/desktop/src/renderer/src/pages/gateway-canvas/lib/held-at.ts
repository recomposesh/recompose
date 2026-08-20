/**
 * One level of a pushed snapshot, read only where the record itself holds the key.
 *
 * @summary A gateway slug, a model id, and a route node id are all a person's own words, so a
 * snapshot read by a bare index would answer for `constructor` as readily as for a route node and
 * hand back a phantom off the prototype chain.
 */
export function heldAt<Value>(
  record: Readonly<Record<string, Value>> | undefined,
  key: string,
): Value | undefined {
  return record !== undefined && Object.hasOwn(record, key) ? record[key] : undefined;
}
