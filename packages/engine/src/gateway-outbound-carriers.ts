import type { Crossing, JsonObject, ProviderDialect } from './gateway-wire';

import { isJsonObject } from './gateway-wire';
import { decodeGeminiClaudeCarrier } from './provider/gemini-claude-carrier';

/**
 * The assistant turns a body carries, with every block no vendor will read taken back out.
 *
 * @summary Two blocks reach a target that refuses the whole turn over them. A Gemini signature
 * carrier is a thought signature smuggled through the Anthropic dialect as a thinking block holding
 * no reasoning, and only the Gemini request path knows how to spend one, so it is dropped wherever
 * else a turn crosses. An empty text block is refused outright (`text content is empty`) and every
 * upstream translator already skips one, so it is dropped whichever way the turn is going. Neither
 * loses anything a caller wrote.
 */
export function withoutGeminiCarriers(
  body: JsonObject,
  crossing: Crossing,
  upstreamDialect: ProviderDialect,
): JsonObject {
  if (crossing.dialect !== 'anthropic') return body;

  const messages = body['messages'];

  if (!Array.isArray(messages)) return body;

  const carriersToo = upstreamDialect !== 'gemini';

  return { ...body, messages: messages.map((message) => kept(message, carriersToo)) };
}

function kept(message: unknown, carriersToo: boolean): unknown {
  if (!isJsonObject(message)) return message;

  const content = message['content'];

  if (!Array.isArray(content)) return message;

  return { ...message, content: content.filter((block) => !unservable(block, carriersToo)) };
}

function unservable(block: unknown, carriersToo: boolean): boolean {
  if (!isJsonObject(block)) return false;
  if (block['type'] === 'text') return block['text'] === '';

  return carriersToo && isCarrier(block);
}

function isCarrier(block: JsonObject): boolean {
  if (block['type'] !== 'thinking' || block['thinking'] !== '') return false;

  return decodeGeminiClaudeCarrier(block['signature']) !== null;
}
