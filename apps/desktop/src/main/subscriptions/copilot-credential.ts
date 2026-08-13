/**
 * The addresses a signed-in Copilot account is read and spent through.
 *
 * @summary The long-lived credential GitHub issues is not the one a turn carries. It buys a
 * short-lived Copilot credential from the token endpoint, which is what CC Switch does in
 * `src-tauri/src/proxy/providers/copilot_auth.rs`.
 */
export const copilotApi = {
  token: 'https://api.github.com/copilot_internal/v2/token',
  user: 'https://api.github.com/user',
} as const;

/**
 * How long before expiry recompose buys the next short-lived credential.
 *
 * @summary A credential that lapses part way through fails a request a person is watching, so the
 * next one is bought while the current one still works. The margin is CC Switch's.
 */
export const copilotRefreshMarginMs = 60_000;

type CopilotCredentialMinted = {
  verdict: 'minted';
  credential: string;
  expiresAtMs: number;
};

type CopilotCredentialRefused = { verdict: 'refused'; reason: string };

export type CopilotCredentialTraded = CopilotCredentialMinted | CopilotCredentialRefused;

function readsAsObject(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null;
}

async function readAsObject(
  fetchLike: typeof fetch,
  url: string,
  githubCredential: string,
): Promise<Record<string, unknown> | null> {
  try {
    const answer = await fetchLike(url, {
      method: 'GET',
      headers: { accept: 'application/json', authorization: `token ${githubCredential}` },
      redirect: 'error',
    });

    if (!answer.ok) {
      return null;
    }

    const body: unknown = await answer.json();

    return readsAsObject(body) ? body : null;
  } catch {
    return null;
  }
}

function textAt(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];

  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/**
 * Trades the long-lived credential for the short-lived one a turn carries.
 *
 * @summary The vault holds what GitHub issued, and this buys what a request spends. A refusal is
 * a typed answer rather than a throw, because the caller decides whether a lapsed account reads
 * as lapsed or as a turn that could not be served.
 */
export async function buyACopilotToken(
  fetchLike: typeof fetch,
  githubCredential: string,
): Promise<CopilotCredentialTraded> {
  const body = await readAsObject(fetchLike, copilotApi.token, githubCredential);

  if (body === null) {
    return { verdict: 'refused', reason: 'GitHub refused to mint a Copilot credential.' };
  }

  const credential = textAt(body, 'token');

  if (credential === undefined) {
    return {
      verdict: 'refused',
      reason: 'GitHub did not mint a Copilot credential for this account.',
    };
  }

  const expiresAt = body['expires_at'];

  return {
    verdict: 'minted',
    credential,
    expiresAtMs: typeof expiresAt === 'number' ? expiresAt * 1_000 : 0,
  };
}

/** The account that signed in, or nothing where the look answered none. */
export async function signedInAs(
  fetchLike: typeof fetch,
  githubCredential: string,
): Promise<string | undefined> {
  const body = await readAsObject(fetchLike, copilotApi.user, githubCredential);

  return body === null ? undefined : textAt(body, 'login');
}
