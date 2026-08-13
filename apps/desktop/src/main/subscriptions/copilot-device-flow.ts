/**
 * The addresses GitHub's device authorization runs against.
 *
 * @summary The client identity is Visual Studio Code's own, which is what every shipped Copilot
 * bridge uses because GitHub registers no other for a terminal. CC Switch names the same one in
 * `src-tauri/src/proxy/providers/copilot_auth.rs`.
 */
export const copilotEndpoints = {
  deviceCode: 'https://github.com/login/device/code',
  token: 'https://github.com/login/oauth/access_token',
  clientId: 'Iv1.b507a08c87ecfe98',
} as const;

const readUserScope = 'read:user';

type DeviceCodeShown = {
  verdict: 'shown';
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  intervalMs: number;
  expiresInMs: number;
};

export type DeviceFlowRefused = { verdict: 'refused'; reason: string };

export type DeviceCodeAsked = DeviceCodeShown | DeviceFlowRefused;

type Authorized = { verdict: 'authorized'; credential: string };

export type AuthorizationSettled = Authorized | DeviceFlowRefused;

function refused(reason: string): DeviceFlowRefused {
  return { verdict: 'refused', reason };
}

async function jsonOrNothing(fetchLike: typeof fetch, url: string, body: string): Promise<unknown> {
  try {
    const answer = await fetchLike(url, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
      body,
      redirect: 'error',
    });

    return answer.ok ? await answer.json() : null;
  } catch {
    return null;
  }
}

function readsAsObject(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null;
}

function textAt(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];

  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function secondsAt(body: Record<string, unknown>, key: string, fallback: number): number {
  const value = body[key];

  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

const defaultIntervalSeconds = 5;

const defaultExpirySeconds = 900;

/**
 * Asks GitHub for the code a person types, or says why no code came back.
 *
 * @summary The answer carries the pace GitHub wants to be asked at, so the wait never polls faster
 * than the server allows. An answer without a device code refuses, because showing a person a
 * verification address with nothing to type there wastes the trip.
 */
export async function askForADeviceCode(fetchLike: typeof fetch): Promise<DeviceCodeAsked> {
  const asked = new URLSearchParams({
    client_id: copilotEndpoints.clientId,
    scope: readUserScope,
  });
  const body = await jsonOrNothing(fetchLike, copilotEndpoints.deviceCode, asked.toString());

  if (!readsAsObject(body)) {
    return refused('GitHub did not answer the device request.');
  }

  const deviceCode = textAt(body, 'device_code');
  const userCode = textAt(body, 'user_code');
  const verificationUri = textAt(body, 'verification_uri');

  if (deviceCode === undefined || userCode === undefined || verificationUri === undefined) {
    return refused('GitHub answered the device request without a code.');
  }

  return {
    verdict: 'shown',
    deviceCode,
    userCode,
    verificationUri,
    intervalMs: secondsAt(body, 'interval', defaultIntervalSeconds) * 1_000,
    expiresInMs: secondsAt(body, 'expires_in', defaultExpirySeconds) * 1_000,
  };
}

/**
 * How much longer the wait holds off after GitHub asks it to slow down.
 *
 * @summary GitHub answers `slow_down` when it wants more room, and RFC 8628 says the client adds
 * to its own interval rather than retrying at the same pace.
 */
const slowDownStepMs = 5_000;

const terminalRefusals: Readonly<Record<string, string>> = {
  access_denied: 'The sign-in was denied on GitHub.',
  expired_token: 'The code expired before it was entered.',
  unsupported_grant_type: 'GitHub refused the grant this sign-in asked for.',
  incorrect_client_credentials: 'GitHub did not recognize the client this sign-in named.',
};

export type AuthorizationWait = {
  intervalMs: number;
  expiresInMs: number;
  sleep: (ms: number) => Promise<void>;
  elapsedMs: () => number;
};

const deviceGrantType = 'urn:ietf:params:oauth:grant-type:device_code';

const expiredReason = 'The code expired before it was entered.';

type StillWaiting = { verdict: 'waiting'; askedForMoreRoom: boolean };

type PollStep = AuthorizationSettled | StillWaiting;

function waitingOn(error: string): StillWaiting {
  return { verdict: 'waiting', askedForMoreRoom: error === 'slow_down' };
}

/**
 * What one ask at the token endpoint means for the wait.
 *
 * @summary An answer nobody could read leaves the wait where it was, because a dropped request is
 * not a refusal. GitHub names the refusals it calls terminal, and anything else is a person who
 * has yet to type the code.
 */
function stepFrom(body: unknown): PollStep {
  if (!readsAsObject(body)) {
    return { verdict: 'waiting', askedForMoreRoom: false };
  }

  const credential = textAt(body, 'access_token');

  if (credential !== undefined) {
    return { verdict: 'authorized', credential };
  }

  const error = textAt(body, 'error') ?? '';
  const terminal = terminalRefusals[error];

  return terminal === undefined ? waitingOn(error) : refused(terminal);
}

/**
 * Waits for a person to authorize the code, at the pace GitHub asks to be asked at.
 *
 * @summary The wait stops on a refusal GitHub calls terminal rather than asking on, because a
 * denied or expired code never becomes authorized. It also stops once the code outlives its own
 * window, so a person who walked away leaves nothing polling forever.
 */
export async function awaitAuthorization(
  fetchLike: typeof fetch,
  deviceCode: string,
  wait: AuthorizationWait,
): Promise<AuthorizationSettled> {
  const asked = new URLSearchParams({
    client_id: copilotEndpoints.clientId,
    device_code: deviceCode,
    grant_type: deviceGrantType,
  }).toString();
  let holdOffMs = wait.intervalMs;

  while (wait.elapsedMs() < wait.expiresInMs) {
    const step = stepFrom(await jsonOrNothing(fetchLike, copilotEndpoints.token, asked));

    if (step.verdict !== 'waiting') {
      return step;
    }

    holdOffMs += step.askedForMoreRoom ? slowDownStepMs : 0;

    await wait.sleep(holdOffMs);
  }

  return refused(expiredReason);
}
