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

function recordAt(value: unknown, key: string): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }

  const found = value[key];

  return isRecord(found) ? found : null;
}

function spokenAt(value: unknown, key: string): string | undefined {
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
 * subscription, so it never reads as an account this app can adopt or serve.
 */
function codexFactsIn(credential: unknown): CredentialFacts {
  const session = recordAt(credential, 'tokens');
  const claims = sessionClaims(spokenAt(session, 'id_token'));
  const seconds = countedAt(claims, 'exp');

  return {
    holdsAccount: session !== null,
    holdsKey: spokenAt(credential, 'OPENAI_API_KEY') !== undefined,
    signedInAs: spokenAt(claims, 'email'),
    plan: spokenAt(recordAt(claims, 'https://api.openai.com/auth'), 'chatgpt_plan_type'),
    expiresAt: seconds === undefined ? undefined : seconds * 1000,
  };
}

export function credentialFactsFor(
  provider: SubscriptionProviderId,
  credential: unknown,
  identity: unknown,
): CredentialFacts {
  return provider === 'openai' ? codexFactsIn(credential) : claudeFactsIn(credential, identity);
}
