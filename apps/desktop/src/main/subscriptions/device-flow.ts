/**
 * What one vendor's device authorization is reached at, and what it wants to be told.
 *
 * @summary RFC 8628 fixes the shape of the exchange and leaves the addresses, the client identity
 * and any vendor headers to whoever implements it. Naming those here is what lets one wait serve
 * every plan that signs in this way, rather than a second copy of the same loop per vendor.
 */
export type DeviceFlowVendor = {
  /** What a person calls the far end, which is how every refusal here names who refused. */
  name: string;
  deviceCode: string;
  token: string;
  clientId: string;
  /** What the device request asks for beyond the client, which not every vendor takes. */
  scope?: string;
  /** Headers the vendor expects on both asks, which is where a vendor names the caller. */
  headers?: Readonly<Record<string, string>>;
};

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

type Authorized = { verdict: 'authorized'; credential: string; refreshToken: string | undefined };

export type AuthorizationSettled = Authorized | DeviceFlowRefused;

export function refused(reason: string): DeviceFlowRefused {
  return { verdict: 'refused', reason };
}

export async function jsonOrNothing(
  fetchLike: typeof fetch,
  url: string,
  body: string,
  headers: Readonly<Record<string, string>> = {},
): Promise<unknown> {
  try {
    const answer = await fetchLike(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        ...headers,
      },
      body,
      redirect: 'error',
    });

    return answer.ok ? await answer.json() : null;
  } catch {
    return null;
  }
}

export function readsAsObject(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null;
}

export function textAt(body: Record<string, unknown>, key: string): string | undefined {
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
 * Asks a vendor for the code a person types, or says why no code came back.
 *
 * @summary The answer carries the pace the vendor wants to be asked at, so the wait never polls
 * faster than the server allows. An answer without a device code refuses, because showing a person
 * a verification address with nothing to type there wastes the trip. The address carrying the code
 * is preferred over the bare one, because RFC 8628 leaves a bare page free to offer no way to type
 * the code, and Kimi's answers `missing user_code parameter` to anyone who arrives without it.
 */
function codeShownIn(body: Record<string, unknown>, name: string): DeviceCodeAsked {
  const deviceCode = textAt(body, 'device_code');
  const userCode = textAt(body, 'user_code');
  const verificationUri =
    textAt(body, 'verification_uri_complete') ?? textAt(body, 'verification_uri');

  if (deviceCode === undefined || userCode === undefined || verificationUri === undefined) {
    return refused(`${name} answered the device request without a code.`);
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

export async function askForADeviceCode(
  fetchLike: typeof fetch,
  vendor: DeviceFlowVendor,
): Promise<DeviceCodeAsked> {
  const asked = new URLSearchParams({
    client_id: vendor.clientId,
    ...(vendor.scope === undefined ? {} : { scope: vendor.scope }),
  });
  const body = await jsonOrNothing(
    fetchLike,
    vendor.deviceCode,
    asked.toString(),
    vendor.headers ?? {},
  );

  return readsAsObject(body)
    ? codeShownIn(body, vendor.name)
    : refused(`${vendor.name} did not answer the device request.`);
}

/**
 * How much longer the wait holds off after a vendor asks it to slow down.
 *
 * @summary A vendor answers `slow_down` when it wants more room, and RFC 8628 says the client adds
 * to its own interval rather than retrying at the same pace.
 */
const slowDownStepMs = 5_000;

const expiredReason = 'The code expired before it was entered.';

function terminalRefusalsBy(name: string): Readonly<Record<string, string>> {
  return {
    access_denied: `The sign-in was denied on ${name}.`,
    expired_token: expiredReason,
    unsupported_grant_type: `${name} refused the grant this sign-in asked for.`,
    incorrect_client_credentials: `${name} did not recognize the client this sign-in named.`,
    invalid_grant: `${name} refused the code this sign-in offered.`,
  };
}

export type AuthorizationWait = {
  intervalMs: number;
  expiresInMs: number;
  sleep: (ms: number) => Promise<void>;
  elapsedMs: () => number;
};

const deviceGrantType = 'urn:ietf:params:oauth:grant-type:device_code';

type StillWaiting = { verdict: 'waiting'; askedForMoreRoom: boolean };

type PollStep = AuthorizationSettled | StillWaiting;

function waitingOn(error: string): StillWaiting {
  return { verdict: 'waiting', askedForMoreRoom: error === 'slow_down' };
}

/**
 * What one ask at the token endpoint means for the wait.
 *
 * @summary An answer nobody could read leaves the wait where it was, because a dropped request is
 * not a refusal. RFC 8628 names the refusals that are terminal, and anything else is a person who
 * has yet to type the code. Some vendors answer a pending sign-in with a plain 200 carrying only
 * an error word, which is why the token rather than the status decides that a sign-in landed.
 */
function stepFrom(body: unknown, name: string): PollStep {
  if (!readsAsObject(body)) {
    return { verdict: 'waiting', askedForMoreRoom: false };
  }

  const credential = textAt(body, 'access_token');

  if (credential !== undefined) {
    return { verdict: 'authorized', credential, refreshToken: textAt(body, 'refresh_token') };
  }

  const error = textAt(body, 'error') ?? '';
  const terminal = terminalRefusalsBy(name)[error];

  return terminal === undefined ? waitingOn(error) : refused(terminal);
}

/**
 * Waits for a person to authorize the code, at the pace the vendor asks to be asked at.
 *
 * @summary The wait stops on a refusal the vendor calls terminal rather than asking on, because a
 * denied or expired code never becomes authorized. It also stops once the code outlives its own
 * window, so a person who walked away leaves nothing polling forever.
 */
export async function awaitAuthorization(
  fetchLike: typeof fetch,
  vendor: DeviceFlowVendor,
  deviceCode: string,
  wait: AuthorizationWait,
): Promise<AuthorizationSettled> {
  const asked = new URLSearchParams({
    client_id: vendor.clientId,
    device_code: deviceCode,
    grant_type: deviceGrantType,
  }).toString();
  let holdOffMs = wait.intervalMs;

  while (wait.elapsedMs() < wait.expiresInMs) {
    const step = stepFrom(
      await jsonOrNothing(fetchLike, vendor.token, asked, vendor.headers ?? {}),
      vendor.name,
    );

    if (step.verdict !== 'waiting') {
      return step;
    }

    holdOffMs += step.askedForMoreRoom ? slowDownStepMs : 0;

    await wait.sleep(holdOffMs);
  }

  return refused(expiredReason);
}
