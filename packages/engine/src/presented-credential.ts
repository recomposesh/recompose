import type { Context } from 'hono';

const BEARER = 'bearer ';

const KEY_HEADERS = ['x-api-key', 'x-goog-api-key'];

/**
 * The credential inside an `Authorization` header, whether or not the client named its scheme.
 *
 * @summary Some clients send `Bearer <key>` and some send the key alone, so the scheme comes off
 * where it stands and the value passes through where it doesn't. The comparison is case-insensitive
 * because the scheme name is. Whatever spacing a client left around its value comes off below,
 * along with every other field's.
 */
function offeredIn(authorization: string | undefined): string | undefined {
  if (authorization === undefined) {
    return undefined;
  }

  return authorization.toLowerCase().startsWith(BEARER)
    ? authorization.slice(BEARER.length)
    : authorization;
}

/**
 * Every place a caller may have put its credential, in the order a reader should prefer them.
 *
 * @summary Four spellings reach this gateway because four vendors' clients each chose one. Both the
 * guard that decides whether a request may pass and the fingerprint that scopes a caller's replay
 * read this one list, so a caller that authenticates cannot be a caller the fingerprint cannot see.
 *
 * The scheme comes off before either of them looks, which is what makes `Authorization: Bearer x`
 * and `x-api-key: x` the same caller rather than two.
 */
export function presentedCredentials(c: Context): (string | undefined)[] {
  return [
    offeredIn(c.req.header('authorization')),
    ...KEY_HEADERS.map((header) => c.req.header(header)),
    c.req.query('key'),
  ].map((offered) => offered?.trim());
}

/** The one credential a reader that must choose should read, and nothing when none was offered. */
export function presentedCredential(c: Context): string | undefined {
  return presentedCredentials(c).find((offered) => offered !== undefined && offered !== '');
}
