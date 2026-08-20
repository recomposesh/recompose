import type { MiddlewareHandler } from 'hono';

import { timingSafeEqual } from 'node:crypto';

import { turnedAway } from './gateway-turned-away';
import { presentedCredentials } from './presented-credential';
import { apiKeyRequired } from './refusals';

const OPEN_PATHS = new Set(['/health', '/healthz', '/api/hello']);

/**
 * Whether a value a caller presented is the key the gateway holds.
 *
 * @summary `timingSafeEqual` refuses two buffers of different lengths, so the length decides first
 * and the bytes decide in constant time. That order tells an attacker how long the key is and
 * nothing else: never which bytes were right, and never how many leading bytes matched. The length
 * is a published fact of the format anyway, since every minted key is 52 characters.
 *
 * Reducing both sides to a digest first would hide even the length, and it's what the earlier draft
 * did. It came out because a digest over a value named `apiKey` reads to a scanner as a password
 * hash carrying no work factor, and the honest answer to that reading is not a slower hash on every
 * request but no hash at all.
 */
function matches(presented: string, held: Buffer): boolean {
  const offered = Buffer.from(presented);

  return offered.length === held.length && timingSafeEqual(offered, held);
}

/**
 * The guard standing between a gateway that requires a key and everyone who reaches its port.
 *
 * @summary It mounts after the loopback guard and inside the serving turn, so a refused request is
 * keyed and left on the log while still reaching no virtual model, which is what keeps it off every
 * cable. A caller may carry the key in any field `presentedCredentials` reads, and any single match
 * serves: a client that fills its own
 * field with a placeholder while carrying the real key in another is ordinary rather than hostile. The
 * compare runs in constant time, so nothing says how many leading bytes a guess got right. An absent
 * key and a wrong one draw the same answer, because telling them apart would say whether this gateway
 * holds a key at all.
 *
 * The health paths stay open. A health path that needs a credential cannot do the one job it exists
 * for, and the hello probe is one of them: a client reads it to decide whether this base URL is
 * reachable at all, which it asks before it has any reason to have sent a key.
 */
export function guardApiKey(displayName: string, apiKey: string): MiddlewareHandler {
  const held = Buffer.from(apiKey);

  return async (c, next) => {
    if (OPEN_PATHS.has(c.req.path)) {
      return next();
    }

    const presented = presentedCredentials(c);

    if (presented.some((candidate) => candidate !== undefined && matches(candidate, held))) {
      return next();
    }

    return turnedAway(c, apiKeyRequired(displayName), 401, { 'WWW-Authenticate': 'Bearer' });
  };
}
