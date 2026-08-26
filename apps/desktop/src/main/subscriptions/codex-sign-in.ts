import { createHash, randomBytes } from 'node:crypto';

import type { BrowserSignInPort, BrowserSignInSettled } from './browser-sign-in-port';

import { jsonOrNothing, readsAsObject, refused, textAt } from './device-flow';
import { awaitLoopbackCallback, loopbackRedirectUri } from './loopback-callback';

/**
 * Where Codex's sign-in runs, and the client it runs under.
 *
 * @summary Every address, the client and the callback port are Codex's own, read from CLIProxyAPI's
 * `internal/auth/codex/openai_auth.go` and matching what OpenAI ships in `openai/codex`. The client
 * carries no secret because OAuth for native apps gives a public client none to keep, and the proof
 * that binds the exchange is the verifier this run mints rather than a shared word.
 */
export const codexVendor = {
  auth: 'https://auth.openai.com/oauth/authorize',
  token: 'https://auth.openai.com/oauth/token',
  clientId: 'app_EMoamEEZ73f0CkXaXp7hrann',
  callbackPort: 1455,
  callbackPath: '/auth/callback',
  scope: 'openid email profile offline_access',
} as const;

const ACCOUNT_CLAIM = 'https://api.openai.com/auth';

function redirectUri(callbackPort: number): string {
  return loopbackRedirectUri(callbackPort, codexVendor.callbackPath);
}

type Proof = { verifier: string; challenge: string };

/**
 * @summary The verifier never leaves this machine until the code comes back, so the only party
 * that can spend an intercepted authorization code is the run that asked for it.
 */
function mintProof(): Proof {
  const verifier = randomBytes(96).toString('base64url');

  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
}

function authorizationUrl(state: string, challenge: string, callbackPort: number): string {
  const asked = new URLSearchParams({
    client_id: codexVendor.clientId,
    response_type: 'code',
    redirect_uri: redirectUri(callbackPort),
    scope: codexVendor.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'login',
    id_token_add_organizations: 'true',
    codex_cli_simplified_flow: 'true',
  });

  return `${codexVendor.auth}?${asked.toString()}`;
}

async function exchanged(
  port: BrowserSignInPort,
  code: string,
  proof: Proof,
  callbackPort: number,
): Promise<unknown> {
  return jsonOrNothing(
    port.fetchLike,
    codexVendor.token,
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: codexVendor.clientId,
      code,
      redirect_uri: redirectUri(callbackPort),
      code_verifier: proof.verifier,
    }).toString(),
  );
}

function claimsIn(token: string | undefined): Record<string, unknown> | null {
  const payload = token?.split('.')[1];

  if (payload === undefined) {
    return null;
  }

  try {
    const read: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));

    return readsAsObject(read) ? read : null;
  } catch {
    return null;
  }
}

/**
 * @summary OpenAI names the account a turn bills against inside the identity token rather than
 * beside it, so the only way to learn it is to read the claim. Every serving turn spells that
 * account on the wire, which is why a sign-in that cannot find one still keeps the tokens: the
 * record then reads exactly as one Codex itself wrote before it learned an organization.
 */
function accountIdIn(claims: Record<string, unknown> | null): string | undefined {
  const auth = claims === null ? null : claims[ACCOUNT_CLAIM];

  return readsAsObject(auth) ? textAt(auth, 'chatgpt_account_id') : undefined;
}

/**
 * @summary The record keeps the shape Codex writes at `auth.json`, so a credential this app minted
 * and one adopted from a Codex install read the same way everywhere downstream. No `OPENAI_API_KEY`
 * rides along, because a record carrying one reads as a Codex signed out into key mode, which is
 * not a subscription at all.
 */
function codexCredentialFrom(
  body: Record<string, unknown>,
  accountId: string | undefined,
  now: string,
): string {
  const idToken = textAt(body, 'id_token');
  const refreshToken = textAt(body, 'refresh_token');

  return JSON.stringify({
    tokens: {
      access_token: textAt(body, 'access_token'),
      ...(refreshToken === undefined ? {} : { refresh_token: refreshToken }),
      ...(idToken === undefined ? {} : { id_token: idToken }),
      ...(accountId === undefined ? {} : { account_id: accountId }),
    },
    last_refresh: now,
  });
}

/**
 * Signs in to a ChatGPT plan through the browser a person already trusts with their OpenAI account.
 *
 * @summary The browser opens only once the loopback is listening, so a person who authorizes
 * immediately is never redirected at a port nothing holds. Nothing here runs Codex: the exchange is
 * this app's, which is what lets a plan be added on a machine carrying no Codex at all. The grant
 * it mints is its own, so rotating it never touches the one a Codex install already holds.
 */
export async function signInToCodex(port: BrowserSignInPort): Promise<BrowserSignInSettled> {
  const state = port.mintState();
  const proof = mintProof();
  const callbackPort = port.callbackPortFor('openai');
  const listening = awaitLoopbackCallback({
    state,
    boundMs: port.boundMs,
    callbackPort,
    path: codexVendor.callbackPath,
  });

  await port.openInBrowser(authorizationUrl(state, proof.challenge, callbackPort));

  const handed = await listening;

  if (!('code' in handed)) {
    return refused(handed.reason);
  }

  return keptFrom(await exchanged(port, handed.code, proof, callbackPort));
}

function keptFrom(body: unknown): BrowserSignInSettled {
  if (!readsAsObject(body) || textAt(body, 'access_token') === undefined) {
    return refused('OpenAI answered the sign-in without a token.');
  }

  const claims = claimsIn(textAt(body, 'id_token'));
  const email = claims === null ? undefined : textAt(claims, 'email');

  return {
    verdict: 'signed-in',
    credential: codexCredentialFrom(body, accountIdIn(claims), new Date().toISOString()),
    ...(email === undefined ? {} : { signedInAs: email }),
  };
}
