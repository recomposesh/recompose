import { describe, expect, test } from 'vitest';

import {
  boundedCodexCallId,
  normalizedCodexItemId,
  sanitizeCodexReasoningBody,
} from './codex-identities';

const longId = 'a'.repeat(80);

const prefixedItemIds: [string, string][] = [
  ['message', 'msg_item_1'],
  ['reasoning', 'rs_item_1'],
  ['function_call', 'fc_item_1'],
  ['custom_tool_call', 'ctc_item_1'],
  ['custom_tool_call_output', 'ctco_item_1'],
];

describe('bounding the call id Codex accepts', () => {
  test('a short call id stays as it is', () => {
    expect(boundedCodexCallId('call_1')).toBe('call_1');
  });

  test('a call id past the ceiling keeps a stable digest suffix', () => {
    const bounded = boundedCodexCallId(longId);

    expect(bounded).toHaveLength(64);
    expect(bounded).toBe(boundedCodexCallId(longId));
  });

  test('a call id that is not text passes through untouched', () => {
    expect(boundedCodexCallId(7)).toBe(7);
  });
});

describe('prefixing the item ids Codex replays', () => {
  test.each(prefixedItemIds)(
    'a %s item id gains the prefix its type asks for',
    (type, expected) => {
      expect(normalizedCodexItemId({ type, id: 'item_1' })).toBe(expected);
    },
  );

  test.each(prefixedItemIds)(
    'a %s item id that already carries its prefix stays as it is',
    (type, id) => {
      expect(normalizedCodexItemId({ type, id })).toBe(id);
    },
  );

  test('an item id carrying the prefix of another type gains its own as well', () => {
    expect(normalizedCodexItemId({ type: 'reasoning', id: 'msg_item_1' })).toBe('rs_msg_item_1');
  });

  test('a custom tool output gains its dedicated prefix', () => {
    expect(normalizedCodexItemId({ type: 'custom_tool_call_output', id: 'item_1' })).toBe(
      'ctco_item_1',
    );
  });

  test('an item type Codex does not prefix keeps the id it arrived with', () => {
    expect(normalizedCodexItemId({ type: 'function_call_output', id: 'item_1' })).toBe('item_1');
  });

  test('an empty item id stays empty', () => {
    expect(normalizedCodexItemId({ type: 'message', id: '' })).toBe('');
  });

  test('an entry whose id is not text has no normalized id', () => {
    expect(normalizedCodexItemId({ type: 'message', id: 7 })).toBeUndefined();
  });

  test('a prefixed item id past the ceiling keeps a stable digest suffix', () => {
    const bounded = normalizedCodexItemId({ type: 'reasoning', id: longId });

    expect(bounded).toHaveLength(64);
    expect(bounded).toBe(normalizedCodexItemId({ type: 'reasoning', id: longId }));
  });
});

describe('sanitizing the reasoning Codex may not replay', () => {
  test('a body whose input is not a list passes through untouched', () => {
    const body = { input: 'hello' };

    expect(sanitizeCodexReasoningBody(body)).toBe(body);
  });

  test('a body whose entries need no repair passes through untouched', () => {
    const body = { input: [{ type: 'message', role: 'user' }] };

    expect(sanitizeCodexReasoningBody(body)).toBe(body);
  });

  test('an input entry that is not an object survives the pass', () => {
    const body = { input: ['stray', { type: 'reasoning', encrypted_content: 'nonsense' }] };

    expect(sanitizeCodexReasoningBody(body)).toMatchObject({
      input: ['stray', { type: 'reasoning' }],
    });
  });

  test('an unstored reasoning entry loses both its identity and its payload', () => {
    expect(
      sanitizeCodexReasoningBody({
        input: [{ type: 'reasoning', id: 'rs_1', encrypted_content: 'nonsense' }],
      }),
    ).toEqual({ input: [{ type: 'reasoning' }] });
  });

  test('a stored reasoning entry keeps its identity and loses only its payload', () => {
    expect(
      sanitizeCodexReasoningBody({
        store: true,
        input: [{ type: 'reasoning', id: 'rs_1', encrypted_content: 'nonsense' }],
      }),
    ).toEqual({ store: true, input: [{ type: 'reasoning', id: 'rs_1' }] });
  });
});
