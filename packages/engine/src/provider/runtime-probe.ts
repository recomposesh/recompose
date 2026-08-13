import type { LocalProviderId, RuntimeReachability } from '@recompose/contracts';

import { nonBlankString, runtimeLookBoundMs, runtimeLookFor } from '@recompose/contracts';

async function answerOrSilence(
  fetchLike: typeof fetch,
  address: string,
  path: string,
): Promise<Response | null> {
  try {
    return await fetchLike(`${address}${path}`, {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(runtimeLookBoundMs),
    });
  } catch {
    return null;
  }
}

function versionOf(body: unknown, field: string): string | null {
  if (typeof body !== 'object' || body === null || !(field in body)) {
    return null;
  }

  const version = nonBlankString.safeParse(Reflect.get(body, field));

  return version.success ? version.data : null;
}

type BodyLook = { silenced: boolean; body: unknown };

function aBodyArrivedButWasNotJson(reason: unknown): boolean {
  return reason instanceof SyntaxError;
}

async function bodyOrSilence(response: Response): Promise<BodyLook> {
  try {
    return { silenced: false, body: await response.json() };
  } catch (reason) {
    return { silenced: !aBodyArrivedButWasNotJson(reason), body: null };
  }
}

/**
 * Whether an answer that named no version still reads as the runtime.
 *
 * @summary A runtime publishing no version is recognized by answering a path only it serves, so
 * the answer has to be one it could have written: an object rather than a sentence, a bare number
 * or a null. Anything else on the port is a stranger.
 */
function readsAsTheRuntime(body: unknown): boolean {
  return typeof body === 'object' && body !== null;
}

/**
 * What a look at one address found, read as the runtime a person picked or as a stranger.
 *
 * @summary The look asks that runtime's own path rather than a shared one. Every server here
 * answers `/v1/models`, so a shared path would report whichever server holds the port as the
 * runtime a person picked. A runtime naming where its version sits must produce one, because the
 * version is what proves the answer came from that runtime. A runtime publishing none is proved
 * by the path itself, so it answers without claiming a version it never gave.
 */
export async function probeRuntime(
  fetchLike: typeof fetch,
  address: string,
  provider: LocalProviderId,
): Promise<RuntimeReachability> {
  const look = runtimeLookFor(provider);
  const response = await answerOrSilence(fetchLike, address, look.identityPath);

  if (response === null) {
    return { verdict: 'unreachable' };
  }

  if (!response.ok) {
    return { verdict: 'unrecognized', status: response.status };
  }

  const read = await bodyOrSilence(response);

  if (read.silenced) {
    return { verdict: 'unreachable' };
  }

  return reachabilityOf(read.body, look.versionField, response.status);
}

function reachabilityOf(
  body: unknown,
  versionField: string | undefined,
  status: number,
): RuntimeReachability {
  if (versionField === undefined) {
    return readsAsTheRuntime(body) ? { verdict: 'answers' } : { verdict: 'unrecognized', status };
  }

  const version = versionOf(body, versionField);

  return version === null ? { verdict: 'unrecognized', status } : { verdict: 'answers', version };
}
