import type { Context, MiddlewareHandler } from 'hono';

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { apiKeyRequired } from './refusals';

const OPEN_PATHS = new Set(['/health', '/healthz']);

const BEARER = 'bearer ';

/**
 * One request's value and the gateway's key, reduced to a pair of fixed-width tags.
 *
 * @summary The tag exists so the constant-time compare meets two buffers of equal length whatever
 * the caller sent, which is what keeps the check from leaking the key's length. It's keyed rather
 * than bare so nobody can compute the tag of a guess without the secret this process minted at
 * start, and it is never stored: the key it stands for is a 256-bit random value, so the slow
 * derivations a person's password would need buy nothing here.
 */
function tagOf(value: string, comparisonKey: Buffer): Buffer {
  return createHmac('sha256', comparisonKey).update(value).digest();
}

function matches(presented: string, held: Buffer, comparisonKey: Buffer): boolean {
  return timingSafeEqual(tagOf(presented, comparisonKey), held);
}

/**
 * The credential inside an `Authorization` header, whether or not the client named its scheme.
 *
 * @summary Some clients send `Bearer <key>` and some send the key alone, so the scheme comes off
 * where it stands and the value passes through where it doesn't. The comparison is case-insensitive
 * because the scheme name is, and the trim covers a client that spaced its value out.
 */
function offeredIn(authorization: string | undefined): string | undefined {
  if (authorization === undefined) {
    return undefined;
  }

  return authorization.toLowerCase().startsWith(BEARER)
    ? authorization.slice(BEARER.length).trimStart()
    : authorization;
}

const KEY_HEADERS = ['x-api-key', 'x-goog-api-key'];

function presentedKeys(c: Context): (string | undefined)[] {
  return [
    offeredIn(c.req.header('authorization')),
    ...KEY_HEADERS.map((header) => c.req.header(header)),
    c.req.query('key')?.trim(),
  ];
}

/**
 * The guard standing between a gateway that requires a key and everyone who reaches its port.
 *
 * @summary It mounts after the loopback guard and before the serving turn opens, so a refused request
 * never counts as traffic and never reaches a virtual model. A caller may carry the key in any of the
 * four fields the gateway's four dialects use, and any single match serves: a client that fills its own
 * field with a placeholder while carrying the real key in another is ordinary rather than hostile. Both
 * sides hash before the compare, so the constant-time check leaks neither the key's length nor how many
 * leading characters a guess got right. An absent key and a wrong one draw the same answer, because
 * telling them apart would say whether this gateway holds a key at all.
 *
 * The health paths stay open. A health path that needs a credential cannot do the one job it exists
 * for.
 */
export function guardApiKey(displayName: string, apiKey: string): MiddlewareHandler {
  const comparisonKey = randomBytes(32);
  const held = tagOf(apiKey, comparisonKey);

  return async (c, next) => {
    if (OPEN_PATHS.has(c.req.path)) {
      return next();
    }

    const presented = presentedKeys(c);

    if (
      presented.some(
        (candidate) => candidate !== undefined && matches(candidate, held, comparisonKey),
      )
    ) {
      return next();
    }

    return c.json(apiKeyRequired(displayName), 401, { 'WWW-Authenticate': 'Bearer' });
  };
}
