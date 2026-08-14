import type { AnthropicMessage } from './dialect/anthropic-wire';
import type { ChatMessage } from './dialect/chat-completions-wire';
import type { RequestOf } from './dialect/dispatcher';
import type { JsonObject } from './json-object';

import { isJsonObject } from './json-object';

const wireBlockKinds = new Set([
  'text',
  'thinking',
  'redacted_thinking',
  'image',
  'document',
  'tool_use',
  'tool_result',
]);

const toolResultPartKinds = new Set([
  'text',
  'image',
  'search_result',
  'document',
  'tool_reference',
]);

function isToolResultPart(value: unknown): boolean {
  return (
    isJsonObject(value) &&
    typeof value['type'] === 'string' &&
    toolResultPartKinds.has(value['type'])
  );
}

function readsToolResultContent(content: unknown): boolean {
  return (
    content === undefined ||
    typeof content === 'string' ||
    (Array.isArray(content) && content.every(isToolResultPart))
  );
}

function readsDocument(value: JsonObject): boolean {
  const source = value['source'];

  return (
    isJsonObject(source) &&
    source['type'] === 'base64' &&
    typeof source['media_type'] === 'string' &&
    typeof source['data'] === 'string'
  );
}

function readsWireBlock(value: JsonObject): boolean {
  if (value['type'] === 'tool_result') {
    return readsToolResultContent(value['content']);
  }

  return value['type'] !== 'document' || readsDocument(value);
}

function isWireBlock(value: unknown): boolean {
  return (
    isJsonObject(value) &&
    typeof value['type'] === 'string' &&
    wireBlockKinds.has(value['type']) &&
    readsWireBlock(value)
  );
}

function isWireContent(content: unknown): boolean {
  return typeof content === 'string' || (Array.isArray(content) && content.every(isWireBlock));
}

function isWireMessage(value: unknown): value is AnthropicMessage {
  if (!isJsonObject(value)) {
    return false;
  }

  const role = value['role'];

  return (
    (role === 'user' || role === 'assistant' || role === 'system') &&
    isWireContent(value['content'])
  );
}

/**
 * Whether a body reads as the Anthropic messages wire, block for block.
 *
 * @summary A body that only looks close enough would translate into something the provider silently
 * mangles, so the reading is exact: every message, every content block, and every tool result part
 * has to be a shape this dialect defines.
 */
export function speaksAnthropicWire(body: JsonObject): body is JsonObject & RequestOf['anthropic'] {
  const messages = body['messages'];

  return Array.isArray(messages) && messages.every(isWireMessage);
}

const chatRoles = new Set(['system', 'developer', 'user', 'assistant', 'tool']);

function isChatMessage(value: unknown): value is ChatMessage {
  return isJsonObject(value) && typeof value['role'] === 'string' && chatRoles.has(value['role']);
}

/**
 * Whether a body reads as the chat completions wire.
 *
 * @summary The role is the whole test, because every other field of this dialect is optional and a
 * body naming a role recompose does not serve is a caller's mistake rather than a shape to guess at.
 */
export function speaksChatCompletions(
  body: JsonObject,
): body is JsonObject & RequestOf['chat-completions'] {
  const messages = body['messages'];

  return Array.isArray(messages) && messages.every(isChatMessage);
}
