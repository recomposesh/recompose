import { createServer } from 'node:http';

import { antigravityProjectFor } from './antigravity-project';
import { jsonOrNothing, readsAsObject, refused, textAt } from './device-flow';

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
  scopes: [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/cclog',
    'https://www.googleapis.com/auth/experimentsandconfigs',
  ],
} as const;

export type AntigravitySignInPort = {
  fetchLike: typeof fetch;
  /** How the onboarding a first sign-in may run waits between asks. */
  sleep: (ms: number) => Promise<void>;
  /**
   * The loopback port the browser is redirected back to.
   *
   * @summary Google matches this client's redirect exactly, so a shipped sign-in has to use the
   * one the client is registered with. It is asked for rather than read here so a reading can hold
   * a port of its own instead of racing whatever else on the machine wants that one.
   */
  callbackPort: number;
  /** Hands the authorization address to whatever the person browses with. */
  openInBrowser: (url: string) => Promise<void>;
  /** How long the callback is waited for before the sign-in gives the port back. */
  boundMs: number;
  /** The unguessable word the callback has to carry back, which binds it to this ask. */
  mintState: () => string;
};

type AntigravitySignedIn = { verdict: 'signed-in'; credential: string; signedInAs?: string };

export type AntigravitySignInSettled = AntigravitySignedIn | { verdict: 'refused'; reason: string };

function redirectUri(callbackPort: number): string {
  return `http://localhost:${String(callbackPort)}/oauth-callback`;
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

const CLOSING_PAGE =
  '<!doctype html><meta charset="utf-8"><title>recompose</title>' +
  '<p style="font:14px -apple-system,sans-serif;padding:2rem">Signed in. You can close this tab.</p>';

type Handed = { code: string } | { reason: string };

/**
 * Holds the one loopback port Google is told to come back to, until it does.
 *
 * @summary Google redirects a browser rather than answering a request, so the only way to hear the
 * code is to be listening where the ask said the answer goes. The answer waits on the listener
 * having actually let go, keep-alive connections included, because a person who abandons one
 * sign-in and starts another would otherwise be told nothing could listen on the port.
 * The state is compared here rather than trusted, so a stray callback settles nothing.
 */
async function awaitTheCallback(
  state: string,
  boundMs: number,
  callbackPort: number,
): Promise<Handed> {
  return new Promise<Handed>((settle) => {
    const server = createServer((request, response) => {
      const asked = new URL(request.url ?? '/', redirectUri(callbackPort));

      response.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        connection: 'close',
      });
      response.end(CLOSING_PAGE);

      const code = asked.searchParams.get('code');
      const said = asked.searchParams.get('state');

      if (asked.searchParams.get('error') !== null) {
        done({ reason: 'The sign-in was denied in the browser.' });
      } else if (code === null || said !== state) {
        done({ reason: 'The browser came back without the code this sign-in asked for.' });
      } else {
        done({ code });
      }
    });

    const giveUp = setTimeout(() => {
      done({ reason: 'The sign-in was not finished in the browser in time.' });
    }, boundMs);

    let settled = false;

    function done(handed: Handed): void {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(giveUp);
      server.closeAllConnections();
      server.close(() => {
        settle(handed);
      });
    }

    server.on('error', () => {
      done({ reason: `Nothing could listen on port ${String(callbackPort)}.` });
    });
    server.listen(callbackPort, '127.0.0.1');
  });
}

async function exchanged(port: AntigravitySignInPort, code: string): Promise<unknown> {
  return jsonOrNothing(
    port.fetchLike,
    antigravityVendor.token,
    new URLSearchParams({
      code,
      client_id: antigravityVendor.clientId,
      client_secret: antigravityVendor.clientSecret,
      redirect_uri: redirectUri(port.callbackPort),
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
  port: AntigravitySignInPort,
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
export async function signInToAntigravity(
  port: AntigravitySignInPort,
): Promise<AntigravitySignInSettled> {
  const state = port.mintState();
  const listening = awaitTheCallback(state, port.boundMs, port.callbackPort);

  await port.openInBrowser(authorizationUrl(state, port.callbackPort));

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
async function keptFrom(
  port: AntigravitySignInPort,
  body: unknown,
): Promise<AntigravitySignInSettled> {
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
