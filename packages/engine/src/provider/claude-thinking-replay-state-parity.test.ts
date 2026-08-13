import { expect, test } from 'vitest';

import { ClaudeThinkingReplay } from './claude-thinking-replay';
import { KimiThinkingReplay } from './kimi-thinking-replay';

test('TestClaudeThinkingReplayClearDoesNotClearKimiState', () => {
  const claude = new ClaudeThinkingReplay();
  const kimi = new KimiThinkingReplay();

  claude.commit('shared-model', 'execution', turn('claude-signature'));
  kimi.commit('shared-model', 'execution', turn('kimi-signature'));

  claude.clearAll();

  expect(claude.totalBytes()).toBe(0);
  expect(kimi.totalBytes()).toBeGreaterThan(0);
});

function turn(signature: string) {
  return [
    { type: 'thinking', thinking: 'reasoning', signature },
    { type: 'tool_use', id: 'toolu_1', name: 'Read', input: { path: 'README.md' } },
  ];
}
