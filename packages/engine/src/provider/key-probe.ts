import type { KeyCheckReport, KeyCheckVerdict, KeyCustody } from '@recompose/contracts';

import { keyProbeBoundMs } from '@recompose/contracts';

import { lookHeadersFor, modelsPathFor } from './look-request';

function verdictFor(status: number): KeyCheckVerdict {
  if (Math.floor(status / 100) === 2) {
    return 'authenticates';
  }

  if (status === 401 || status === 403) {
    return 'not-accepted';
  }

  return 'could-not-check';
}

/**
 * Whether one stored key still opens the vendor it was stored for.
 *
 * @summary The check reads the model catalog the vendor already publishes, at the origin the host
 * resolved for the account, so a key pasted for any vendor recompose serves is checkable rather
 * than only the handful whose headers differ. Only the status is read, because a catalog that
 * answers at all has already accepted the credential that asked for it.
 */
export async function probeKey(
  fetchLike: typeof fetch,
  origin: string,
  custody: KeyCustody,
): Promise<KeyCheckReport> {
  try {
    const response = await fetchLike(`${origin}${modelsPathFor(custody)}`, {
      method: 'GET',
      headers: lookHeadersFor(custody),
      redirect: 'error',
      signal: AbortSignal.timeout(keyProbeBoundMs),
    });

    return { verdict: verdictFor(response.status), status: response.status };
  } catch {
    console.error(
      `The ${custody.provider} probe could not reach ${origin}, so the check did not run.`,
    );

    return { verdict: 'could-not-check' };
  }
}
