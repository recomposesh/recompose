import type { BrowserSignInPort, BrowserSignInSettled } from './browser-sign-in-port';

import { antigravityProjectFor } from './antigravity-project';
import { jsonOrNothing, readsAsObject, refused, textAt } from './device-flow';
import { awaitLoopbackCallback, loopbackRedirectUri } from './loopback-callback';

/**
 * Where Antigravity's sign-in runs, and the client it runs under.
 *
 * @summary Every address, the client pair and the callback port are Antigravity's own, read from
 * CLIProxyAPI's `internal/auth/antigravity/constants.go`. The secret is a public desktop client's,
 * which Google's own guidance says is not a secret: it is shipped in the tool a person already
 * runs, and the redirect back to this machine is what actually binds the exchange.
 */
export const antigravityVendor = {
  auth: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  userInfo: 'https://www.googleapis.com/oauth2/v2/userinfo?alt=json',
  clientId: '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com',
  clientSecret: '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',
  callbackPort: 51121,
  callbackPath: '/oauth-callback',
  scopes: [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/cclog',
    'https://www.googleapis.com/auth/experimentsandconfigs',
  ],
} as const;

function redirectUri(callbackPort: number): string {
  return loopbackRedirectUri(callbackPort, antigravityVendor.callbackPath);
}

export function authorizationUrl(state: string, callbackPort: number): string {
  const asked = new URLSearchParams({
    access_type: 'offline',
    client_id: antigravityVendor.clientId,
    prompt: 'consent',
    redirect_uri: redirectUri(callbackPort),
    response_type: 'code',
    scope: antigravityVendor.scopes.join(' '),
    state,
  });

  return `${antigravityVendor.auth}?${asked.toString()}`;
}

async function exchanged(port: BrowserSignInPort, code: string): Promise<unknown> {
  return jsonOrNothing(
    port.fetchLike,
    antigravityVendor.token,
    new URLSearchParams({
      code,
      client_id: antigravityVendor.clientId,
      client_secret: antigravityVendor.clientSecret,
      redirect_uri: redirectUri(port.callbackPortFor('antigravity')),
      grant_type: 'authorization_code',
    }).toString(),
  );
}

/**
 * @summary Google names the address on a endpoint of its own rather than in the token answer, and
 * a plan with no address still connects, so a lookup that fails leaves the account unnamed rather
 * than refusing a sign-in that already landed.
 */
async function addressBehind(
  port: BrowserSignInPort,
  accessToken: string,
): Promise<string | undefined> {
  try {
    const answer = await port.fetchLike(antigravityVendor.userInfo, {
      headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
      redirect: 'error',
    });
    const body: unknown = answer.ok ? await answer.json() : null;

    return readsAsObject(body) ? textAt(body, 'email') : undefined;
  } catch {
    return undefined;
  }
}

type Landed = {
  accessToken: string;
  email: string | undefined;
  projectId: string;
};

/**
 * @summary The record keeps the shape CLIProxyAPI writes, so a credential this app minted and one
 * adopted from that tool read the same way everywhere downstream. The project rides with the token
 * because every serving turn names it, and a record without one connects but answers nothing.
 */
function antigravityCredentialFrom(body: Record<string, unknown>, landed: Landed): string {
  const refreshToken = textAt(body, 'refresh_token');

  return JSON.stringify({
    type: 'antigravity',
    access_token: landed.accessToken,
    ...(refreshToken === undefined ? {} : { refresh_token: refreshToken }),
    project_id: landed.projectId,
    ...(landed.email === undefined ? {} : { email: landed.email }),
  });
}

/**
 * Signs in to Antigravity through the browser a person already trusts with their Google account.
 *
 * @summary The browser opens only once the loopback is listening, so a person who authorizes
 * immediately is never redirected at a port nothing holds. Nothing here shells out to another
 * tool: the exchange is this app's, which is what lets a plan be connected on a machine that
 * carries no such tool at all.
 */
export async function signInToAntigravity(port: BrowserSignInPort): Promise<BrowserSignInSettled> {
  const state = port.mintState();
  const callbackPort = port.callbackPortFor('antigravity');
  const listening = awaitLoopbackCallback({
    state,
    boundMs: port.boundMs,
    callbackPort,
    path: antigravityVendor.callbackPath,
  });

  await port.openInBrowser(authorizationUrl(state, callbackPort));

  const handed = await listening;

  if (!('code' in handed)) {
    return refused(handed.reason);
  }

  return keptFrom(port, await exchanged(port, handed.code));
}

/**
 * @summary Every way this can fall short after the redirect lands is a refusal a person reads, so
 * the three of them stand together rather than each interrupting the flow that led here.
 */
async function keptFrom(port: BrowserSignInPort, body: unknown): Promise<BrowserSignInSettled> {
  if (!readsAsObject(body)) {
    return refused('Google did not answer the sign-in this app started.');
  }

  const accessToken = textAt(body, 'access_token');

  if (accessToken === undefined) {
    return refused('Google answered the sign-in without a token.');
  }

  const [email, projectId] = await Promise.all([
    addressBehind(port, accessToken),
    antigravityProjectFor(port, accessToken),
  ]);

  if (projectId === undefined) {
    return refused('Google named no Antigravity project for this account.');
  }

  return {
    verdict: 'signed-in',
    credential: antigravityCredentialFrom(body, { accessToken, email, projectId }),
    ...(email === undefined ? {} : { signedInAs: email }),
  };
}
