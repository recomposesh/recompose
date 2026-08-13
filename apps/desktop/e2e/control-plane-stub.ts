/** Where each vendor rotates a token, and where Claude Code's own account lookup lands. */
const TOKEN_PATHS = new Set(['/v1/oauth/token', '/oauth/token', '/token']);

const PROFILE_PATH = '/api/oauth/profile';

/** How long a rotated token stands, which every scenario renewing one reads back. */
const REFRESHED_WINDOW_SECONDS = 8 * 60 * 60;

/**
 * @summary A vendor rotating a token answers a fresh one and spends the refresh token it was
 * handed, so the stand-in hands back a different one each time the way both real endpoints do.
 */
function rotatedTokenBody(): string {
  return JSON.stringify({
    access_token: `stand-in-access-${String(Date.now())}`,
    refresh_token: `stand-in-refresh-${String(Date.now())}`,
    expires_in: REFRESHED_WINDOW_SECONDS,
    token_type: 'Bearer',
  });
}

function profileBody(): string {
  return JSON.stringify({
    account: { uuid: 'stand-in-account', email_address: 'dev@example.com' },
    organization: { uuid: 'stand-in-organization' },
  });
}

/**
 * What a vendor's control plane answers, or nothing where the path names no control-plane route.
 *
 * @summary These are the calls that carry no target origin of their own: the token endpoint every
 * renewal asks under and the profile lookup that names an account. No scenario scripts them,
 * because a scenario about renewal is about what the app does with the answer, never about a
 * vendor refusing to give one.
 */
export function controlPlaneBodyFor(path: string): string | null {
  if (TOKEN_PATHS.has(path)) {
    return rotatedTokenBody();
  }

  return path === PROFILE_PATH ? profileBody() : null;
}
