import type { JsonObject } from '../gateway-wire';

import { isJsonObject } from '../gateway-wire';

const contextManagement = {
  edits: [{ type: 'clear_thinking_20251015', keep: 'all' }],
} as const;

function thinkingTypeIn(body: JsonObject): unknown {
  const thinking = body['thinking'];

  return isJsonObject(thinking) ? thinking['type'] : undefined;
}

/**
 * Whether the request is one the thinking-clearing strategy may be declared on.
 *
 * @summary Anthropic refuses `clear_thinking_20251015` on a request that is not thinking, saying so
 * in as many words: the strategy requires thinking enabled or adaptive. Claude Code always asks for
 * thinking, so its captured wire never showed the refusal, but a caller through this gateway may
 * ask for none, and a routing judge asks for none by design.
 */
function thinkingTakesTheStrategy(body: JsonObject): boolean {
  const type = thinkingTypeIn(body);

  return type === 'enabled' || type === 'adaptive';
}

export function withClaudeContextManagement(body: JsonObject): JsonObject {
  if (body['context_management'] !== undefined || !thinkingTakesTheStrategy(body)) {
    return body;
  }

  return { ...body, context_management: structuredClone(contextManagement) };
}
