import type { SubscriptionProviderId } from '@recompose/contracts';

/**
 * @summary `holdsAccount` answers whether a subscription stands here, which is what adoption asks.
 * `holdsKey` answers whether a key stands here instead, which counts as signed in for a home the
 * app owns and never counts as a subscription to adopt.
 */
export type CredentialFacts = {
  holdsAccount: boolean;
  holdsKey: boolean;
  signedInAs: string | undefined;
  plan: string | undefined;
  expiresAt: number | undefined;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function recordAt(value: unknown, key: string): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }

  const found = value[key];

  return isRecord(found) ? found : null;
}

export function spokenAt(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const found = value[key];
  const said = typeof found === 'string' ? found.trim() : '';

  return said === '' ? undefined : said;
}

function countedAt(value: unknown, key: string): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const found = value[key];

  return typeof found === 'number' && Number.isFinite(found) ? found : undefined;
}

export function documentIn(blob: string | null): unknown {
  if (blob === null) {
    return null;
  }

  try {
    return JSON.parse(blob);
  } catch {
    return null;
  }
}

export function claudeOauthIn(document: unknown): Record<string, unknown> | null {
  return recordAt(document, 'claudeAiOauth');
}

function planNamedByRateTier(tier: string | undefined): string | undefined {
  return tier?.match(/claude_(?<plan>max|pro|enterprise)/)?.groups?.['plan'];
}

function claudeFactsIn(credential: unknown, identity: unknown): CredentialFacts {
  const oauth = claudeOauthIn(credential);
  const account = recordAt(identity, 'oauthAccount');

  return {
    holdsAccount: oauth !== null,
    holdsKey: false,
    signedInAs: spokenAt(account, 'emailAddress'),
    plan:
      spokenAt(oauth, 'subscriptionType') ??
      spokenAt(identity, 'subscriptionType') ??
      planNamedByRateTier(spokenAt(account, 'userRateLimitTier')),
    expiresAt: countedAt(oauth, 'expiresAt'),
  };
}

function sessionClaims(token: string | undefined): unknown {
  const payload = token?.split('.')[1];

  if (payload === undefined) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * @summary A Codex record in key mode carries a key and no session block, which is not a
 * subscription, so it never reads as an account this app can adopt or serve. The address and the
 * plan come from the identity token, which Codex lets lapse within the hour and never renews, while
 * the moment the record lapses is the spent token's own, the way Codex decides it too.
 */
function codexFactsIn(credential: unknown): CredentialFacts {
  const session = recordAt(credential, 'tokens');
  const claims = sessionClaims(spokenAt(session, 'id_token'));
  const seconds = countedAt(sessionClaims(spokenAt(session, 'access_token')), 'exp');

  return {
    holdsAccount: session !== null,
    holdsKey: spokenAt(credential, 'OPENAI_API_KEY') !== undefined,
    signedInAs: spokenAt(claims, 'email'),
    plan: spokenAt(recordAt(claims, 'https://api.openai.com/auth'), 'chatgpt_plan_type'),
    expiresAt: seconds === undefined ? undefined : seconds * 1000,
  };
}

/**
 * What a record CLIProxyAPI wrote says about the account behind it.
 *
 * @summary The tool flattens whatever it learned at sign-in into the top level of the file it
 * writes, so the address rides beside the tokens rather than inside a nested account record
 * (`sdk/auth/antigravity.go`). Kimi's record carries no address at all, which is why an account
 * signed in that way reads by its plan name and not by an address this app never received.
 */
function cliProxyFactsIn(credential: unknown): CredentialFacts {
  const record = isRecord(credential) ? credential : null;

  return {
    holdsAccount: spokenAt(record, 'access_token') !== undefined,
    holdsKey: false,
    signedInAs: spokenAt(record, 'email'),
    plan: undefined,
    expiresAt: undefined,
  };
}

/**
 * @summary GitHub issues a bare credential rather than a record, so the file this app writes holds
 * the token and nothing else. There is no shape to read fields out of: the token standing there at
 * all is the whole of what the file says.
 */
function copilotFactsIn(blob: string | null): CredentialFacts {
  return {
    holdsAccount: blob !== null && blob.trim() !== '',
    holdsKey: false,
    signedInAs: undefined,
    plan: undefined,
    expiresAt: undefined,
  };
}

/**
 * What one plan's stored credential says about the account behind it.
 *
 * @summary The blob arrives unparsed because not every plan stores a record: one stores a bare
 * token. Parsing here rather than at each caller is what keeps a reader from having to know which
 * plans store which shape.
 */
export function credentialFactsFor(
  provider: SubscriptionProviderId,
  credential: string | null,
  identity: string | null,
): CredentialFacts {
  if (provider === 'copilot') {
    return copilotFactsIn(credential);
  }

  const document = documentIn(credential);

  if (provider === 'antigravity' || provider === 'kimi') {
    return cliProxyFactsIn(document);
  }

  return provider === 'openai'
    ? codexFactsIn(document)
    : claudeFactsIn(document, documentIn(identity));
}
