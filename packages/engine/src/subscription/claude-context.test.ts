import { describe, expect, test } from 'vitest';

import { withClaudeContextManagement } from './claude-context';

describe('Claude Code context management', () => {
  test.each(['enabled', 'adaptive'])('injects the captured object for thinking type %s', (type) => {
    expect(withClaudeContextManagement({ model: 'claude-opus-5', thinking: { type } })).toEqual({
      model: 'claude-opus-5',
      thinking: { type },
      context_management: {
        edits: [{ type: 'clear_thinking_20251015', keep: 'all' }],
      },
    });
  });

  test('preserves caller-owned context management', () => {
    const caller = { edits: [{ type: 'caller-owned' }] };

    expect(
      withClaudeContextManagement({ context_management: caller, thinking: { type: 'enabled' } }),
    ).toEqual({ context_management: caller, thinking: { type: 'enabled' } });
  });

  test('does not inject when thinking is disabled', () => {
    expect(withClaudeContextManagement({ thinking: { type: 'disabled' } })).toEqual({
      thinking: { type: 'disabled' },
    });
  });

  test('does not inject where the request asks for no thinking at all', () => {
    expect(withClaudeContextManagement({ model: 'claude-opus-5', max_tokens: 16 })).toEqual({
      model: 'claude-opus-5',
      max_tokens: 16,
    });
  });
});
