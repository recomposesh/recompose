import type { ProviderDialect, SpendGrant } from '@recompose/contracts';

import { vendorEndpointOf } from '@recompose/contracts';

import type { Crossing, JsonObject, ProxyDialect } from '../gateway-wire';

import { prepareClaudeReplay } from './claude-replay-runtime';
import {
  geminiInteractionsBody,
  parseGeminiInteractionsCredential,
} from './gemini-interactions-policy';
import { cappedGeminiOutput } from './gemini-model-limits';
import { prepareKimiReplay } from './kimi-replay-runtime';
import { kimiProviderBody } from './kimi-request';
import {
  applyOpenAICompatPayloadOverride,
  withOpenAICompatPromptCache,
} from './openai-compat-payload';
import { parseVertexCredential, vertexProviderBody, vertexRequestUrl } from './vertex-request';
import { prepareXAIReplay } from './xai-replay-runtime';
import { xaiProviderBody } from './xai-request';
import { collectXAIClientTools } from './xai-tool-ownership';
import { collectXAINamespaceTools } from './xai-tools';

type ResolvedGrant = Extract<SpendGrant, { verdict: 'resolved' }>;
type GrantedSpend = ResolvedGrant['spend'];
type BodyBuilder = (
  crossing: Crossing,
  body: JsonObject,
  accountId: string | undefined,
) => JsonObject;

/**
 * The dialect Kimi serves, which is whichever one the caller opened with.
 *
 * @summary Kimi serves both, so the one a person's tools already speak is the one to answer in.
 */
function kimiDialect(source: ProxyDialect): ProviderDialect {
  return source === 'anthropic' ? 'anthropic' : 'chat-completions';
}

/**
 * How a turn for one credentialed account reads on the wire.
 *
 * @summary A vendor the directory names answers from there, so one table describes the vendor for
 * both processes. Kimi is the one vendor that follows the caller: it serves both dialects, and the
 * one a person opened with is the one their tools already speak. A provider the directory never
 * named answers with what the person stated when they stored the row.
 */
export function credentialedDialect(
  provider: string,
  source: ProxyDialect,
  stated?: ProviderDialect,
): ProviderDialect {
  if (provider === 'kimi') return kimiDialect(source);

  return vendorEndpointOf(provider)?.dialect ?? stated ?? 'chat-completions';
}

export function credentialedRequestBody(
  grant: ResolvedGrant,
  crossing: Crossing,
  body: JsonObject,
): JsonObject {
  if (grant.spend.custody !== 'credentialed') return body;

  return preparedCredentialedBody(grant.spend, crossing, body);
}

function preparedCredentialedBody(
  spend: Extract<GrantedSpend, { custody: 'credentialed' }>,
  crossing: Crossing,
  body: JsonObject,
): JsonObject {
  if (spend.provider === 'gemini-interactions') {
    return geminiInteractionsBody(
      crossing,
      body,
      parseGeminiInteractionsCredential(spend.credential),
    );
  }

  const prepared = BODY_BUILDERS.get(spend.provider)?.(crossing, body, spend.accountId) ?? body;
  const cached = withOpenAICompatPromptCache(prepared, {
    ...(crossing.sessionId === undefined ? {} : { sessionId: crossing.sessionId }),
    model: crossing.providerModel,
    protocol: crossing.dialect,
  });

  return applyOpenAICompatPayloadOverride(cached);
}

function xaiBody(crossing: Crossing, body: JsonObject): JsonObject {
  crossing.xaiNamespaceTools = collectXAINamespaceTools(body);

  if (crossing.xaiInjectSearch === true) {
    crossing.xaiSearchOwnership = { clientTools: collectXAIClientTools(body) };
  }

  return xaiProviderBody(prepareXAIReplay(crossing, body), crossing);
}

function aiStudioBody(crossing: Crossing, body: JsonObject): JsonObject {
  const generation = body['generationConfig'];
  const cleaned =
    typeof generation === 'object' && generation !== null && !Array.isArray(generation)
      ? Object.fromEntries(
          Object.entries(generation).filter(
            ([key]) => !['maxOutputTokens', 'responseMimeType', 'responseJsonSchema'].includes(key),
          ),
        )
      : generation;

  return vertexProviderBody({ ...body, generationConfig: cleaned }, crossing);
}

const BODY_BUILDERS = new Map<string, BodyBuilder>([
  ['aistudio', aiStudioBody],
  ['anthropic', prepareClaudeReplay],
  ['gemini', (crossing, body) => cappedGeminiOutput(body, crossing.providerModel)],
  ['xai', xaiBody],
  ['vertex', (crossing, body) => vertexProviderBody(body, crossing)],
  [
    'kimi',
    (crossing, body) =>
      kimiProviderBody(prepareKimiReplay(crossing, body), crossing.providerModel, crossing.dialect),
  ],
]);

function vertexUrl(origin: string, credential: string, crossing: Crossing): string | null {
  const parsed = parseVertexCredential(credential);

  return parsed === null ? null : vertexRequestUrl(origin, parsed, crossing);
}

function geminiUrl(origin: string, crossing: Crossing): string {
  const action =
    crossing.raw['stream'] === true ? 'streamGenerateContent?alt=sse' : 'generateContent';

  return `${origin}/v1beta/models/${encodeURIComponent(crossing.providerModel)}:${action}`;
}

function usesGeminiUrl(provider: string): boolean {
  return provider === 'gemini' || provider === 'aistudio';
}

function interactionsUrl(origin: string): string {
  return `${origin}/v1beta/interactions`;
}

const chatPath = '/v1/chat/completions';

const messagesPath = '/v1/messages';

/**
 * The path a vendor lands on whatever dialect it is reached in.
 *
 * @summary DeepInfra publishes `https://api.deepinfra.com/v1/openai` as the base an OpenAI client
 * is pointed at, so its turn lands one segment shorter than every other compatible vendor. The
 * other two answer one dialect only, so nothing about the crossing can move them.
 */
const FIXED_PATHS = new Map<string, string>([
  ['anthropic', messagesPath],
  ['deepinfra', '/chat/completions'],
  ['xai', '/responses'],
]);

function providerPath(provider: string, crossing: Crossing, dialect?: ProviderDialect): string {
  const fixed = FIXED_PATHS.get(provider);

  if (fixed !== undefined) return fixed;

  if (provider === 'kimi' && crossing.dialect === 'anthropic') return '/v1/messages?beta=true';

  return credentialedDialect(provider, crossing.dialect, dialect) === 'anthropic'
    ? messagesPath
    : chatPath;
}

export function credentialedRequestUrl(grant: ResolvedGrant, crossing: Crossing): string {
  const origin = grant.providerOrigin.replace(/\/+$/u, '');

  if (grant.spend.custody !== 'credentialed') return `${origin}${providerPath('', crossing)}`;

  return credentialedProviderUrl(grant.spend, crossing, origin);
}

function credentialedProviderUrl(
  spend: Extract<GrantedSpend, { custody: 'credentialed' }>,
  crossing: Crossing,
  origin: string,
): string {
  if (spend.provider === 'gemini-interactions') return interactionsUrl(origin);

  if (usesGeminiUrl(spend.provider)) {
    return geminiUrl(origin, crossing);
  }

  const vertex = spend.provider === 'vertex' ? vertexUrl(origin, spend.credential, crossing) : null;

  return vertex ?? `${origin}${providerPath(spend.provider, crossing, spend.dialect)}`;
}
