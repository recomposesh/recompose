import type { SubscriptionProviderId } from '@recompose/contracts';

import type { ParsedSubscriptionCredential, RefreshedTokens } from './credential-shapes';
import type { JsonObject } from './credential-stamps';

import { claudeCredentialFields } from './claude-credential-fields';
import { refreshedFlatDocument } from './credential-shapes';
import { finiteNumber, jwtClaims, jwtExpiry, objectOf, parsedDate } from './credential-stamps';
import { firstNonBlankCredentialValue, nonBlankCredentialValue } from './credential-values';
import { kimiCredential } from './kimi-credential';

export type { ParsedSubscriptionCredential, RefreshedTokens } from './credential-shapes';

function documentOf(blob: string): JsonObject | null {
  try {
    return objectOf(JSON.parse(blob));
  } catch {
    return null;
  }
}

function codexPlanType(token: string): string | undefined {
  const auth = objectOf(jwtClaims(token)?.['https://api.openai.com/auth']);

  return nonBlankCredentialValue(auth?.['chatgpt_plan_type']);
}

function codexCredentialFields(accessToken: string, tokens: JsonObject) {
  const refreshToken = nonBlankCredentialValue(tokens['refresh_token']);
  const accountId = nonBlankCredentialValue(tokens['account_id']);
  const expiresAt = jwtExpiry(accessToken);
  const planType = codexPlanType(accessToken);

  return {
    ...(refreshToken === undefined ? {} : { refreshToken }),
    ...(accountId === undefined ? {} : { accountId }),
    ...(planType === undefined ? {} : { planType }),
    ...(expiresAt === undefined ? {} : { expiresAt }),
  };
}

function claudeCredential(
  document: JsonObject,
  tokens: JsonObject,
): ParsedSubscriptionCredential | null {
  const accessToken = nonBlankCredentialValue(tokens['accessToken']);

  if (accessToken === undefined) {
    return null;
  }

  const refreshToken = nonBlankCredentialValue(tokens['refreshToken']);
  const expiresAt = finiteNumber(tokens['expiresAt']);

  return {
    accessToken,
    ...(refreshToken === undefined ? {} : { refreshToken }),
    ...claudeCredentialFields(document, tokens),
    ...(expiresAt === undefined ? {} : { expiresAt }),
  };
}

function codexCredential(tokens: JsonObject): ParsedSubscriptionCredential | null {
  const accessToken = nonBlankCredentialValue(tokens['access_token']);

  if (accessToken === undefined) {
    return null;
  }

  return {
    accessToken,
    ...codexCredentialFields(accessToken, tokens),
  };
}

function antigravityCredential(document: JsonObject): ParsedSubscriptionCredential | null {
  const accessToken = nonBlankCredentialValue(document['access_token']);

  if (accessToken === undefined) {
    return null;
  }

  const refreshToken = nonBlankCredentialValue(document['refresh_token']);
  const projectId = firstNonBlankCredentialValue(document['project_id'], document['projectId']);
  const expiresAt = parsedDate(document['expired']);

  if (projectId === undefined) {
    return null;
  }

  return {
    accessToken,
    ...(refreshToken === undefined ? {} : { refreshToken }),
    projectId,
    ...(expiresAt === undefined ? {} : { expiresAt }),
  };
}

function nestedCredential(
  provider: Exclude<SubscriptionProviderId, 'antigravity' | 'kimi'>,
  document: JsonObject,
): ParsedSubscriptionCredential | null {
  const tokens = objectOf(
    provider === 'anthropic' ? document['claudeAiOauth'] : document['tokens'],
  );

  if (tokens === null) {
    return null;
  }

  return provider === 'anthropic' ? claudeCredential(document, tokens) : codexCredential(tokens);
}

export function parseSubscriptionCredential(
  provider: SubscriptionProviderId,
  blob: string,
): ParsedSubscriptionCredential | null {
  const document = documentOf(blob);

  if (document === null) {
    return null;
  }

  if (provider === 'antigravity') {
    return antigravityCredential(document);
  }

  if (provider === 'kimi') {
    return kimiCredential(document);
  }

  return nestedCredential(provider, document);
}

export function withClaudeCredentialIdentity(
  originalBlob: string,
  accountUuid: string,
  deviceId: string,
): string {
  const document = documentOf(originalBlob);

  if (document === null) {
    throw new Error('subscription credential document is malformed');
  }

  document['account_uuid'] = accountUuid;
  document['claude_device_ids'] = [deviceId];

  return JSON.stringify(document);
}

function refreshedClaudeDocument(
  document: JsonObject,
  refreshed: RefreshedTokens,
  now: number,
): void {
  const original = objectOf(document['claudeAiOauth']) ?? {};

  document['claudeAiOauth'] = {
    ...original,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? original['refreshToken'],
    expiresAt: now + refreshed.expiresInSeconds * 1000,
  };
}

function refreshedCodexDocument(
  document: JsonObject,
  refreshed: RefreshedTokens,
  now: number,
): void {
  const original = objectOf(document['tokens']) ?? {};

  document['tokens'] = {
    ...original,
    access_token: refreshed.accessToken,
    refresh_token: refreshed.refreshToken ?? original['refresh_token'],
    id_token: refreshed.idToken ?? original['id_token'],
  };
  document['last_refresh'] = new Date(now).toISOString();
}

export function refreshedCredentialBlob(
  provider: SubscriptionProviderId,
  originalBlob: string,
  refreshed: RefreshedTokens,
  now: number,
): string {
  const document = documentOf(originalBlob);

  if (document === null) {
    throw new Error('subscription credential document is malformed');
  }

  if (provider === 'anthropic') {
    refreshedClaudeDocument(document, refreshed, now);
  } else if (provider === 'antigravity') {
    refreshedFlatDocument(document, refreshed, now);
  } else if (provider === 'kimi') {
    refreshedFlatDocument(document, refreshed, now);
  } else {
    refreshedCodexDocument(document, refreshed, now);
  }

  return JSON.stringify(document);
}
