import type { JsonObject } from '../gateway-wire';
import type { ClaudeToolMap } from './claude-tools';

import { isJsonObject, parsedJson } from '../gateway-wire';
import { transformingSseLines } from '../stream-wire';

function isToolReference(block: JsonObject): boolean {
  return block['type'] === 'tool_use' || block['type'] === 'tool_reference';
}

function aliasPrefixOf(alias: string): string {
  const seam = alias.indexOf('_', alias.indexOf('__', 5) + 2);

  return seam < 0 ? alias : alias.slice(0, seam);
}

function soleAliasStartingWith(name: string, reverse: ClaudeToolMap): string | undefined {
  const claiming = Object.keys(reverse).filter((alias) => alias.startsWith(name));

  return claiming.length === 1 ? claiming[0] : undefined;
}

/**
 * The tool name a caller declared, recovered from the alias an upstream sent back.
 *
 * @summary An exact match answers first, because that is what an untouched alias produces. An
 * upstream that trims the semantic tail off the alias leaves a prefix that still identifies one
 * declaration, so the prefix is followed only while exactly one alias claims it. Two aliases
 * sharing a prefix are left alone: guessing between them would rename a caller's tool to the
 * wrong one, which is worse than handing back a name they can see was never restored.
 */
export function restoredToolNames(name: string, reverse: ClaudeToolMap): string {
  const exact = reverse[name];

  if (exact !== undefined) return exact;

  const alias = soleAliasStartingWith(name, reverse);

  if (alias === undefined || aliasPrefixOf(alias) !== aliasPrefixOf(name)) return name;

  return reverse[alias] ?? name;
}

function restoreReference(block: JsonObject, reverse: ClaudeToolMap): void {
  const field = block['type'] === 'tool_use' ? 'name' : 'tool_name';
  const value = block[field];

  if (typeof value === 'string') {
    block[field] = restoredToolNames(value, reverse);
  }
}

function nestedBlocks(block: JsonObject): JsonObject[] {
  const content = Array.isArray(block['content']) ? block['content'] : [];

  return content.filter(isJsonObject);
}

function restoreNestedReferences(block: JsonObject, reverse: ClaudeToolMap): void {
  if (block['type'] !== 'tool_result') {
    return;
  }

  for (const item of nestedBlocks(block)) {
    if (item['type'] === 'tool_reference') {
      restoreReference(item, reverse);
    }
  }
}

function restoreContentBlock(block: JsonObject, reverse: ClaudeToolMap): void {
  if (isToolReference(block)) {
    restoreReference(block, reverse);
  }

  restoreNestedReferences(block, reverse);
}

export function restoreClaudeToolBody(body: JsonObject, reverse: ClaudeToolMap): JsonObject {
  const cloned = structuredClone(body);
  const content = Array.isArray(cloned['content']) ? cloned['content'] : [];

  for (const block of content.filter(isJsonObject)) {
    restoreContentBlock(block, reverse);
  }

  return cloned;
}

function dataPrefix(line: string): string | null {
  if (line.startsWith('data: ')) {
    return 'data: ';
  }

  return line.startsWith('data:') ? 'data:' : null;
}

function contentBlockOf(parsed: unknown): JsonObject | null {
  return isJsonObject(parsed) && isJsonObject(parsed['content_block'])
    ? parsed['content_block']
    : null;
}

export function restoreClaudeToolSseLine(line: string, reverse: ClaudeToolMap): string {
  const prefix = dataPrefix(line);

  if (prefix === null) {
    return line;
  }

  const parsed = parsedJson(line.slice(prefix.length));
  const block = contentBlockOf(parsed);

  if (!isJsonObject(parsed) || block === null || !isToolReference(block)) {
    return line;
  }

  restoreReference(block, reverse);

  return `${prefix}${JSON.stringify(parsed)}`;
}

function restoredSseBody(
  body: ReadableStream<Uint8Array>,
  reverse: ClaudeToolMap,
): ReadableStream<Uint8Array> {
  return transformingSseLines(body, (line) => restoreClaudeToolSseLine(line, reverse));
}

function transformedHeaders(response: Response): Headers {
  const headers = new Headers(response.headers);

  headers.delete('content-length');

  return headers;
}

function responseInit(response: Response): ResponseInit {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: transformedHeaders(response),
  };
}

function isSse(response: Response): boolean {
  return response.headers.get('content-type')?.includes('text/event-stream') === true;
}

async function restoredJsonResponse(response: Response, reverse: ClaudeToolMap): Promise<Response> {
  const text = await response.text();
  const parsed = parsedJson(text);
  const restored = isJsonObject(parsed)
    ? JSON.stringify(restoreClaudeToolBody(parsed, reverse))
    : text;

  return new Response(restored, responseInit(response));
}

export async function restoreClaudeToolResponse(
  response: Response,
  reverse: ClaudeToolMap,
): Promise<Response> {
  if (Object.keys(reverse).length === 0 || response.body === null) {
    return response;
  }

  if (isSse(response)) {
    return new Response(restoredSseBody(response.body, reverse), responseInit(response));
  }

  return restoredJsonResponse(response, reverse);
}
