import type { JsonObject } from './gateway-wire';

import { isJsonObject } from './gateway-wire';

function spoken(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

function isSealedItem(value: JsonObject): boolean {
  const type = value['type'];

  if (type === 'reasoning') return spoken(value['encrypted_content']);

  if (type === 'thinking') return spoken(value['signature']);

  return type === 'encrypted_content' || type === 'redacted_thinking';
}

function carriesSealedItem(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(carriesSealedItem);

  if (!isJsonObject(value)) return false;

  return isSealedItem(value) || Object.values(value).some(carriesSealedItem);
}

function namesTheTurnItContinues(raw: JsonObject): boolean {
  return spoken(raw['previous_response_id']);
}

/**
 * Whether a request asks the provider to carry on from state one account alone is holding.
 *
 * @summary Three shapes say it, one per way a vendor keeps a turn: a named earlier response, sealed
 * reasoning replayed back, and a signed thinking block. All three are opaque to everyone but the
 * account that minted them, so a router that spread this turn would hand a second account a token it
 * cannot read. The scan runs over the whole body rather than one dialect's field, because the same
 * seal reaches the gateway through five request shapes and the answer must not depend on which.
 */
export function turnResumesServerState(raw: JsonObject): boolean {
  return namesTheTurnItContinues(raw) || carriesSealedItem(raw);
}
