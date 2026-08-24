import type { SpendGrant } from '@recompose/contracts';

import { proxyFetchBoundMs } from '@recompose/contracts';

import type { Crossing, JsonObject, ProviderDialect } from '../gateway-wire';
import type { PluginHost } from '../plugin-host';
import type { AIStudioRelay, RelayRequest } from './ai-studio-relay';

import { afterAuthPlugins, flattenedHeaders, headerMap } from '../plugin-after-auth';
import { notePluginExecution } from '../plugin-execution-context';
import { reachAIStudio } from './ai-studio-request';
import { observeClaudeReplay } from './claude-replay-runtime';
import { credentialedRequestHeaders } from './credentialed-headers';
import {
  credentialedDialect,
  credentialedRequestBody,
  credentialedRequestUrl,
} from './credentialed-target';
import { observeKimiReplay } from './kimi-replay-runtime';
import { modelCeilingsFor, statesItsCeiling } from './model-ceilings';
import { providerObservability, providerRequestId } from './provider-observability';
import { correctedForVendor, refusalIsCorrectable } from './vendor-correction';
import { observeXAIReplay } from './xai-replay-runtime';
import { asXaiRefusalReads } from './xai-response';
import { filterXAIInternalSearchResponse } from './xai-search-response';
import { restoreXAIToolResponse } from './xai-tool-response';

type ResolvedGrant = Extract<SpendGrant, { verdict: 'resolved' }>;
type AnswerObserver = (
  crossing: Crossing,
  answer: Response,
  accountId: string | undefined,
) => Promise<Response>;

const ANSWER_OBSERVERS = new Map<string, AnswerObserver>([
  ['anthropic', observeClaudeReplay],
  ['kimi', observeKimiReplay],
]);

function requestFor(grant: ResolvedGrant, crossing: Crossing, body: JsonObject): RelayRequest {
  const normalized = credentialedRequestBody(grant, crossing, body);
  const headers =
    grant.spend.custody === 'credentialed' && grant.spend.provider === 'aistudio'
      ? { 'content-type': 'application/json' }
      : credentialedRequestHeaders(grant.spend, crossing);

  return {
    method: 'POST',
    url: credentialedRequestUrl(grant, crossing),
    headers,
    body: JSON.stringify(normalized),
  };
}

async function rawAnswer(
  grant: ResolvedGrant,
  request: RelayRequest,
  fetchLike: typeof fetch,
  aiStudio?: AIStudioRelay,
): Promise<Response> {
  if (grant.spend.custody === 'credentialed' && grant.spend.provider === 'aistudio') {
    const answer = await reachAIStudio(grant.spend.accountId, request, aiStudio);

    if (answer === null) throw new Error('wsrelay: AI Studio channel is unavailable');

    return answer;
  }

  return fetchLike(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    signal: AbortSignal.timeout(proxyFetchBoundMs),
  });
}

async function providerAnswer(
  grant: ResolvedGrant,
  crossing: Crossing,
  answer: Response,
): Promise<Response> {
  if (grant.spend.custody !== 'credentialed') return answer;

  const observer = ANSWER_OBSERVERS.get(grant.spend.provider);

  if (observer !== undefined) return observer(crossing, answer, grant.spend.accountId);
  if (grant.spend.provider !== 'xai') return answer;

  const decorated = await asXaiRefusalReads(answer);
  const restored = restoreXAIToolResponse(decorated, crossing.xaiNamespaceTools ?? {});
  const filtered = filterXAIInternalSearchResponse(restored, crossing);

  return observeXAIReplay(crossing, filtered);
}

/**
 * The dialect this turn is spoken and answered in, as the turn itself settled it.
 *
 * @summary The wire a turn takes is chosen upstream of this call, because a vendor naming its wire
 * per model cannot be read off the vendor alone. Falling back on the vendor's own table keeps a
 * caller that never resolved a wire reading exactly as it always did.
 */
function turnDialect(crossing: Crossing, grant: ResolvedGrant): ProviderDialect {
  if (crossing.upstreamDialect !== undefined) return crossing.upstreamDialect;

  return grant.spend.custody === 'credentialed'
    ? credentialedDialect(grant.spend.provider, crossing.dialect)
    : 'chat-completions';
}

async function interceptedRequest(
  crossing: Crossing,
  grant: ResolvedGrant,
  prepared: RelayRequest,
  plugins?: PluginHost,
): Promise<{ bodyChanged: boolean; request: RelayRequest } | Response> {
  const intercepted = await afterAuthPlugins(
    crossing,
    turnDialect(crossing, grant),
    headerMap(prepared.headers),
    new TextEncoder().encode(prepared.body),
    plugins,
  );

  if ('response' in intercepted) return intercepted.response;

  const body = new TextDecoder().decode(intercepted.body);

  return {
    bodyChanged: body !== prepared.body,
    request: { ...prepared, headers: flattenedHeaders(intercepted.headers), body },
  };
}

/**
 * The output ceiling the target model states, put on the crossing before the turn is worded.
 *
 * @summary A vendor that refuses an oversized ask rather than clamping it states its own limit per
 * model, so the number is read off its catalog here and the wording downstream brings the turn
 * down to it. A vendor stating none leaves the ask as the caller wrote it.
 */
async function stampOutputCeiling(
  crossing: Crossing,
  grant: ResolvedGrant,
  fetchLike: typeof fetch,
): Promise<void> {
  const spend = grant.spend;

  if (spend.custody !== 'credentialed' || !statesItsCeiling(spend.provider)) return;

  const ceilings = await modelCeilingsFor(
    fetchLike,
    spend.provider,
    grant.providerOrigin,
    credentialedRequestHeaders(spend, crossing),
    spend.accountId ?? '',
  );
  const ceiling = ceilings.get(crossing.providerModel);

  if (ceiling !== undefined) crossing.outputCeiling = ceiling;
}

/**
 * The one turn a vendor's own refusal earns, reworded the way that refusal said it would take it.
 *
 * @summary A refusal naming its remedy is answerable, and once: a second refusal of the same kind
 * would say the same thing again. The refused answer is read to learn the remedy and then let go,
 * so nothing downstream is handed a body already spent.
 */
async function correctedTurn(
  answer: Response,
  body: JsonObject,
): Promise<{ body: JsonObject } | null> {
  if (answer.ok || !refusalIsCorrectable(answer.status)) return null;

  const said: unknown = await answer
    .clone()
    .json()
    .catch(() => undefined);
  const corrected = correctedForVendor(answer.status, said, body);

  return corrected === null ? null : { body: corrected };
}

export async function reachCredentialed(
  crossing: Crossing,
  grant: ResolvedGrant,
  body: JsonObject,
  fetchLike: typeof fetch,
  aiStudio?: AIStudioRelay,
  plugins?: PluginHost,
): Promise<Response> {
  const answer = await reachedOnce(crossing, grant, body, fetchLike, aiStudio, plugins);

  if (answer instanceof Response) {
    const correction = await correctedTurn(answer, body);

    if (correction === null) return answer;

    void answer.body?.cancel().catch(() => undefined);

    return reachedOnce(crossing, grant, correction.body, fetchLike, aiStudio, plugins);
  }

  return answer;
}

async function reachedOnce(
  crossing: Crossing,
  grant: ResolvedGrant,
  body: JsonObject,
  fetchLike: typeof fetch,
  aiStudio?: AIStudioRelay,
  plugins?: PluginHost,
): Promise<Response> {
  await stampOutputCeiling(crossing, grant, fetchLike);

  const prepared = requestFor(grant, crossing, body);
  const intercepted = await interceptedRequest(crossing, grant, prepared, plugins);

  if (intercepted instanceof Response) return intercepted;
  const request = intercepted.request;

  notePluginExecution(
    crossing,
    headerMap(request.headers),
    new TextEncoder().encode(request.body),
    intercepted.bodyChanged,
  );
  const spend = grant.spend;
  const span = providerObservability().start({
    provider: spend.custody === 'credentialed' ? spend.provider : 'open',
    model: crossing.providerModel,
    accountId: spend.custody === 'credentialed' ? spend.accountId : undefined,
    dialect: turnDialect(crossing, grant),
    method: request.method,
    requestId: providerRequestId(new Headers(request.headers)),
  });
  const answer = span.observe(await rawAnswer(grant, request, fetchLike, aiStudio));

  return providerAnswer(grant, crossing, answer);
}
