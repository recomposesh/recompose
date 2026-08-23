import type { Context } from 'hono';

import type { RequestOf } from './dialect/dispatcher';
import type { ResponsesToolRef } from './dialect/responses-extended-tools';
import type { JsonObject } from './json-object';
import type { RenderedRefusal, TranslationRefusal } from './refusals';

import { geminiPayload } from './gateway-gemini-ingress';
import { responsesIngressPayload } from './gateway-responses-ingress';
import { speaksAnthropicWire, speaksChatCompletions } from './gateway-wire-shapes';
import { InvalidJsonBodyError } from './invalid-json-body-error';
import { duplicateJsonKey } from './json-duplicates';
import { isJsonObject } from './json-object';
import { parsePreciseJson } from './json-precise';
import { gatewayRefusedWith } from './provider/serving-turn';
import { renderRefusal } from './refusals';

export { InvalidJsonBodyError };

export type ProxyDialect =
  | 'anthropic'
  | 'chat-completions'
  | 'gemini'
  | 'interactions'
  | 'responses';
export type ProviderDialect = ProxyDialect;

export type { JsonObject } from './json-object';
export { isJsonObject } from './json-object';

export type Crossing = {
  dialect: ProxyDialect;
  raw: JsonObject;
  gatewayName: string;
  virtualModel: string;
  providerModel: string;
  sessionId?: string | undefined;
  replayScopeId?: string | undefined;
  callerFingerprint?: string | undefined;
  isCompat?: boolean | undefined;
  responsesLite?: boolean | undefined;
  anthropicBeta?: string | undefined;
  requestHeaders?: Record<string, string[]> | undefined;
  requestQuery?: Record<string, string[]> | undefined;
  pluginRequestId?: string | undefined;
  pluginExecution?:
    | {
        requestHeaders: Record<string, string[]>;
        originalRequest: Uint8Array;
        requestBody: Uint8Array;
        skipPluginId: string;
      }
    | undefined;
  copilotPath?: string | undefined;
  xaiNamespaceTools?: Record<string, { namespace: string; name: string }> | undefined;
  xaiInjectSearch?: boolean | undefined;
  xaiSearchOwnership?: { clientTools: readonly string[] } | undefined;
  geminiToolNames?: Readonly<Record<string, string>> | undefined;
  geminiNativeWebSearch?: boolean | undefined;
  responsesToolRefs?: Readonly<Record<string, ResponsesToolRef>> | undefined;
  /** The output the target model will take, where its vendor states one and refuses more. */
  outputCeiling?: number | undefined;
};

export function parsedJson(text: string): unknown {
  try {
    return parsePreciseJson(text);
  } catch {
    return undefined;
  }
}

export async function readJsonBody(c: Context): Promise<JsonObject> {
  const text = await c.req.text();
  const body = parsedJson(text);
  const duplicate = duplicateJsonKey(text);

  if (!isJsonObject(body)) {
    throw new InvalidJsonBodyError('The request body must be a JSON object.');
  }

  if (duplicate !== undefined) {
    throw new InvalidJsonBodyError(`The request body repeats the JSON key "${duplicate}".`);
  }

  return body;
}

export function virtualNameOf(body: JsonObject, dialect?: ProxyDialect): string {
  const model = body['model'];

  if (typeof model === 'string') return model;

  const agent = body['agent'];

  return dialect === 'interactions' && typeof agent === 'string' ? agent : '';
}

export function wantsStream(body: JsonObject): boolean {
  return body['stream'] === true;
}

export function streamAsk(raw: JsonObject): { stream?: boolean } {
  return wantsStream(raw) ? { stream: true } : {};
}

export function ingressPayload(
  dialect: 'anthropic',
  body: JsonObject,
): RequestOf['anthropic'] | null;
export function ingressPayload(
  dialect: 'chat-completions',
  body: JsonObject,
): RequestOf['chat-completions'] | null;
export function ingressPayload(dialect: 'gemini', body: JsonObject): RequestOf['gemini'] | null;
export function ingressPayload(
  dialect: 'interactions',
  body: JsonObject,
): RequestOf['interactions'] | null;
export function ingressPayload(
  dialect: 'responses',
  body: JsonObject,
): RequestOf['responses'] | null;
export function ingressPayload(
  dialect: ProxyDialect,
  body: JsonObject,
): RequestOf[ProxyDialect] | null;

export function ingressPayload(
  dialect: ProxyDialect,
  body: JsonObject,
): RequestOf[ProxyDialect] | null {
  if (dialect === 'anthropic') {
    return anthropicPayload(body);
  }

  if (dialect === 'responses') {
    return responsesPayload(body);
  }

  if (dialect === 'interactions') {
    return interactionsPayload(body);
  }

  if (dialect === 'gemini') {
    return geminiPayload(body);
  }

  return chatPayload(body);
}

function anthropicPayload(body: JsonObject): RequestOf['anthropic'] | null {
  return speaksAnthropicWire(body) ? body : null;
}

function responsesPayload(body: JsonObject): RequestOf['responses'] | null {
  return responsesIngressPayload(body);
}

function interactionsPayload(body: JsonObject): RequestOf['interactions'] | null {
  return speaksInteractions(body) ? body : null;
}

function speaksInteractions(body: JsonObject): body is JsonObject & RequestOf['interactions'] {
  return validInteractionsInput(body['input']) && validStream(body['stream']) && oneTarget(body);
}

function validInteractionsInput(input: unknown): boolean {
  return typeof input === 'string' || Array.isArray(input) || isJsonObject(input);
}

function validStream(stream: unknown): boolean {
  return stream === undefined || typeof stream === 'boolean';
}

function oneTarget(body: JsonObject): boolean {
  return (typeof body['model'] === 'string') !== (typeof body['agent'] === 'string');
}

function chatPayload(body: JsonObject): RequestOf['chat-completions'] | null {
  return speaksChatCompletions(body) ? body : null;
}

export function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function retryAfterHeader(rendered: RenderedRefusal): Record<string, string> {
  return rendered.retryAfterSeconds === undefined
    ? {}
    : { 'retry-after': String(rendered.retryAfterSeconds) };
}

/**
 * The one seam a refusal crosses to become a response, wherever in the gateway it was raised.
 *
 * @summary Because every refusal passes here, the wait a caller owes is written once, in the delay
 * seconds RFC 9110 allows, whatever form the provider originally promised it in. No dialect path
 * writes that header itself, so none of them can disagree about it or forget it.
 */
export function refusalResponse(dialect: ProxyDialect, refusal: TranslationRefusal): Response {
  const rendered = renderRefusal(dialect, refusal);

  gatewayRefusedWith(rendered.message);

  return jsonResponse(rendered.body, rendered.status, retryAfterHeader(rendered));
}
