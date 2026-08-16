import { readsAsObject, textAt } from './device-flow';

/**
 * How Antigravity's own hub names itself, and the client Google logs beside it.
 *
 * @summary The engine spells the same agent for the turns it serves, and the boundary between the
 * two processes forbids reaching across for it. Both read from the same place: CLIProxyAPI's
 * `internal/misc`, which is where the version and the shape of the string come from.
 */
const antigravityVersion = '2.2.1';

const hubAgent = `antigravity/hub/${antigravityVersion} darwin/arm64`;

const onboardAgent = `${hubAgent} google-api-nodejs-client/10.3.0`;

const apiEndpoint = 'https://cloudcode-pa.googleapis.com';

const dailyApiEndpoint = 'https://daily-cloudcode-pa.googleapis.com';

const apiVersion = 'v1internal';

const googApiClient = 'gl-node/22.0.0';

export type ProjectLookupPort = {
  fetchLike: typeof fetch;
  sleep: (ms: number) => Promise<void>;
};

/**
 * @summary Google names the project under one of three keys and sometimes nests it under an `id`,
 * which is what CLIProxyAPI reads in `internal/auth/antigravity/auth.go`. Reading all three the
 * same way is what keeps a sign-in working whichever shape the far end answers with.
 */
function namedUnder(value: unknown): string | undefined {
  const named = typeof value === 'string' ? value.trim() : '';

  if (named !== '') {
    return named;
  }

  return readsAsObject(value) ? textAt(value, 'id') : undefined;
}

function projectIn(answer: Record<string, unknown>): string | undefined {
  const keys = ['cloudaicompanionProject', 'projectId', 'project'];

  return keys.map((key) => namedUnder(answer[key])).find((found) => found !== undefined);
}

async function askedAt(
  port: ProjectLookupPort,
  url: string,
  accessToken: string,
  headers: Readonly<Record<string, string>>,
  body: unknown,
): Promise<Record<string, unknown> | null> {
  try {
    const answer = await port.fetchLike(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: '*/*',
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      redirect: 'error',
    });
    const read: unknown = answer.ok ? await answer.json() : null;

    return readsAsObject(read) ? read : null;
  } catch {
    return null;
  }
}

/**
 * @summary A person who never opened Antigravity has no project yet, and the tier the onboarding
 * runs under is the one the far end already marked default for them. Picking it from the answer
 * rather than naming one keeps this from onboarding somebody onto a plan they did not ask for.
 */
function defaultTierIn(loaded: Record<string, unknown>): string {
  const tiers = loaded['allowedTiers'];
  const listed = Array.isArray(tiers) ? tiers : [];
  const preferred = listed.filter(readsAsObject).find((tier) => tier['isDefault'] === true)?.['id'];

  return typeof preferred === 'string' && preferred.trim() !== '' ? preferred : 'free-tier';
}

const onboardAttempts = 5;

const onboardEveryMs = 2_000;

/**
 * Waits out the onboarding Google runs for a person who has no project yet.
 *
 * @summary The far end answers a long-running operation rather than a project, so the ask repeats
 * until it reports itself done. It gives up after a bounded number of turns, because an onboarding
 * that never completes leaves a sign-in polling behind a screen nobody is watching.
 */
async function onboarded(
  port: ProjectLookupPort,
  accessToken: string,
  tierId: string,
): Promise<string | undefined> {
  const userAgent = onboardAgent;
  const body = {
    tier_id: tierId,
    metadata: {
      ide_type: 'ANTIGRAVITY',
      ide_version: antigravityVersion,
      ide_name: 'antigravity',
    },
  };

  for (let attempt = 0; attempt < onboardAttempts; attempt += 1) {
    const answer = await askedAt(
      port,
      `${dailyApiEndpoint}/${apiVersion}:onboardUser`,
      accessToken,
      { 'user-agent': userAgent, 'x-goog-api-client': googApiClient },
      body,
    );

    if (answer === null) {
      return undefined;
    }

    const settled = answer['response'];

    if (answer['done'] === true) {
      return readsAsObject(settled) ? projectIn(settled) : undefined;
    }

    await port.sleep(onboardEveryMs);
  }

  return undefined;
}

/**
 * The Google Cloud project an Antigravity account serves through, or nothing where none stands.
 *
 * @summary Every turn this app serves for the plan names the project, so a credential kept without
 * one is a connected account that answers nothing. The account's own project is asked for at
 * sign-in and stored beside the token, which is what CLIProxyAPI does in `sdk/auth/antigravity.go`.
 */
export async function antigravityProjectFor(
  port: ProjectLookupPort,
  accessToken: string,
): Promise<string | undefined> {
  const loaded = await askedAt(
    port,
    `${apiEndpoint}/${apiVersion}:loadCodeAssist`,
    accessToken,
    { 'user-agent': hubAgent },
    { metadata: { ideType: 'ANTIGRAVITY' } },
  );

  if (loaded === null) {
    return undefined;
  }

  return projectIn(loaded) ?? onboarded(port, accessToken, defaultTierIn(loaded));
}
