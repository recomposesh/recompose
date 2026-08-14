import type { Context, MiddlewareHandler } from 'hono';

import { createHash, timingSafeEqual } from 'node:crypto';

import { apiKeyRequired } from './refusals';

const OPEN_PATHS = new Set(['/health', '/healthz']);

const BEARER_PREFIX = /^Bearer\s+/iu;

function digestOf(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

function matches(presented: string, held: Buffer): boolean {
  return timingSafeEqual(digestOf(presented), held);
}

function presentedKeys(c: Context): string[] {
  const authorization = c.req.header('authorization');

  return [
    authorization === undefined ? undefined : authorization.replace(BEARER_PREFIX, ''),
    c.req.header('x-api-key'),
    c.req.header('x-goog-api-key'),
    c.req.query('key'),
  ]
    .map((candidate) => candidate?.trim() ?? '')
    .filter((candidate) => candidate !== '');
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
  const held = digestOf(apiKey);

  return async (c, next) => {
    if (OPEN_PATHS.has(c.req.path)) {
      return next();
    }

    if (presentedKeys(c).some((candidate) => matches(candidate, held))) {
      return next();
    }

    return c.json(apiKeyRequired(displayName), 401, { 'WWW-Authenticate': 'Bearer' });
  };
}
