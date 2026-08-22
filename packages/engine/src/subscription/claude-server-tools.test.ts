import { describe, expect, test } from 'vitest';

import { prepareClaudeTools } from './claude-tools';

function toolNamesReaching(type: string): unknown {
  const { body } = prepareClaudeTools(
    { tools: [{ type, name: 'operated_by_anthropic' }] },
    'caller-secret',
  );
  const tools = body['tools'];

  return Array.isArray(tools) ? tools[0] : undefined;
}

describe('a tool Anthropic operates rather than the caller', () => {
  test.each([
    ['advisor_20260401'],
    ['agent_toolset_20260401'],
    ['tool_search_tool_20250917'],
    ['web_search_20250305'],
  ])('%s reaches upstream under its own name', (type) => {
    expect(toolNamesReaching(type)).toEqual({ type, name: 'operated_by_anthropic' });
  });

  test('a caller-defined tool is aliased rather than passed through', () => {
    const reaching = toolNamesReaching('custom');

    expect(reaching).not.toEqual({ type: 'custom', name: 'operated_by_anthropic' });
  });
});
