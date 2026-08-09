import { createHash } from 'node:crypto';

import { isCodexReasoningSignature } from '../dialect/responses-shared';
import { isJsonObject } from '../gateway-wire';

type JsonObject = Record<string, unknown>;

function boundedId(value: string): string {
  const characters = Array.from(value);

  if (characters.length <= 64) {
    return value;
  }

  const suffix = `_${createHash('sha256').update(value).digest('hex').slice(0, 16)}`;

  return characters.slice(0, 64 - suffix.length).join('') + suffix;
}

export function boundedCodexCallId(value: unknown): unknown {
  return typeof value === 'string' ? boundedId(value) : value;
}

const ITEM_ID_PREFIXES = new Map<unknown, string>([
  ['message', 'msg'],
  ['reasoning', 'rs'],
  ['function_call', 'fc'],
  ['custom_tool_call', 'ctc'],
]);

function prefixedItemId(type: unknown, id: string): string {
  const prefix = ITEM_ID_PREFIXES.get(type);

  if (prefix === undefined || id === '' || id.startsWith(prefix)) {
    return id;
  }

  return `${prefix}_${id}`;
}

export function normalizedCodexItemId(entry: JsonObject): string | undefined {
  const id = entry['id'];

  if (typeof id !== 'string') {
    return undefined;
  }

  return boundedId(prefixedItemId(entry['type'], id));
}

export function dropsCodexEncryptedReasoning(entry: JsonObject): boolean {
  return (
    entry['type'] === 'reasoning' &&
    typeof entry['id'] === 'string' &&
    Array.from(entry['id']).length > 64 &&
    typeof entry['encrypted_content'] === 'string' &&
    entry['encrypted_content'] !== ''
  );
}

export function sanitizedCodexReasoning(entry: JsonObject): JsonObject {
  return sanitizedReasoningEntry(entry, false);
}

function sanitizedReasoningEntry(entry: JsonObject, store: boolean): JsonObject {
  if (entry['type'] !== 'reasoning') return entry;

  const encrypted = entry['encrypted_content'];

  if (typeof encrypted === 'string' && isCodexReasoningSignature(encrypted)) return entry;

  const { encrypted_content: _encrypted, ...withoutEncrypted } = entry;

  if (store) return withoutEncrypted;

  const { id: _id, ...withoutId } = withoutEncrypted;

  return withoutId;
}

export function sanitizeCodexReasoningBody(body: JsonObject): JsonObject {
  const input = body['input'];

  if (!Array.isArray(input)) return body;

  const store = body['store'] === true;
  const sanitized: unknown[] = input.map((entry: unknown) =>
    isJsonObject(entry) ? sanitizedReasoningEntry(entry, store) : entry,
  );

  return sanitized.every((entry, index) => entry === input[index])
    ? body
    : { ...body, input: sanitized };
}
