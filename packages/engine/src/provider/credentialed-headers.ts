import type { ProviderDialect, SpendGrant } from '@recompose/contracts';

import type { Crossing } from '../gateway-wire';

import { copilotHeaders } from './copilot-request';
import { credentialedDialect } from './credentialed-target';
import {
  geminiInteractionsHeaders as interactionsHeaders,
  parseGeminiInteractionsCredential,
} from './gemini-interactions-policy';
import { parseVertexCredential, vertexHeaders } from './vertex-request';

type GrantedSpend = Extract<SpendGrant, { verdict: 'resolved' }>['spend'];
type HeaderBuilder = (credential: string, crossing: Crossing) => Record<string, string>;

const anthropicVersion = '2023-06-01';

function kimiBetas(client: string | undefined): string {
  const required = ['oauth-2025-04-20', ['interleaved', 'thinking', '2025-05-14'].join('-')];
  const requested =
    client
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? [];

  return [...new Set([...requested, ...required])].join(',');
}

function kimiHeaders(credential: string, crossing: Crossing): Record<string, string> {
  return crossing.dialect === 'anthropic'
    ? {
        authorization: `Bearer ${credential}`,
        'anthropic-version': anthropicVersion,
        'anthropic-beta': kimiBetas(crossing.anthropicBeta),
      }
    : { authorization: `Bearer ${credential}` };
}

function xaiHeaders(credential: string, crossing: Crossing): Record<string, string> {
  return {
    authorization: `Bearer ${credential}`,
    ...(crossing.sessionId === undefined ? {} : { 'x-grok-conv-id': crossing.sessionId }),
  };
}

function firstRequestHeader(crossing: Crossing, name: string): string | undefined {
  const values = crossing.requestHeaders?.[name.toLowerCase()];

  return values?.find((value) => value.trim() !== '');
}

function geminiInteractionsHeaders(credential: string, crossing: Crossing): Record<string, string> {
  const revision = firstRequestHeader(crossing, 'api-revision');

  return interactionsHeaders(parseGeminiInteractionsCredential(credential), revision);
}

function vertexCredentialHeaders(credential: string): Record<string, string> {
  const parsed = parseVertexCredential(credential);

  return parsed === null ? {} : vertexHeaders(parsed);
}

const HEADER_BUILDERS = new Map<string, HeaderBuilder>([
  [
    'anthropic',
    (credential) => ({ 'x-api-key': credential, 'anthropic-version': anthropicVersion }),
  ],
  ['gemini', (credential) => ({ 'x-goog-api-key': credential })],
  ['gemini-interactions', geminiInteractionsHeaders],
  ['vertex', vertexCredentialHeaders],
  ['kimi', kimiHeaders],
  ['copilot', (credential) => copilotHeaders(credential)],
  ['xai', xaiHeaders],
]);

/**
 * The headers an account with no builder of its own carries.
 *
 * @summary Every vendor without a builder reads a bearer token. One that speaks the Anthropic
 * dialect reads the version the dialect is written against beside it, because the endpoint refuses
 * a request that names no version. A plan token stays a bearer token rather than becoming an
 * `x-api-key`, which is the header a first-party Anthropic key uses and these endpoints reject.
 */
function bearerHeaders(
  credential: string,
  dialect: ProviderDialect | undefined,
): Record<string, string> {
  const bearer = { authorization: `Bearer ${credential}` };

  return dialect === 'anthropic' ? { ...bearer, 'anthropic-version': anthropicVersion } : bearer;
}

function providerHeaders(
  spend: Extract<GrantedSpend, { custody: 'credentialed' }>,
  crossing: Crossing,
): Record<string, string> {
  const built = HEADER_BUILDERS.get(spend.provider);

  if (built !== undefined) return built(spend.credential, crossing);

  return bearerHeaders(
    spend.credential,
    credentialedDialect(spend.provider, crossing.dialect, spend.dialect),
  );
}

export function credentialedRequestHeaders(
  spend: GrantedSpend,
  crossing: Crossing,
): Record<string, string> {
  const shared = { 'content-type': 'application/json' };

  return spend.custody === 'credentialed'
    ? { ...shared, ...providerHeaders(spend, crossing) }
    : shared;
}
