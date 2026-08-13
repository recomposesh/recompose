import { expect, test } from 'vitest';

import { ClaudeThinkingReplay } from './claude-thinking-replay';
import { KimiThinkingReplay } from './kimi-thinking-replay';

test('TestClaudeThinkingReplayClearDoesNotClearKimiState', () => {
  const claude = new ClaudeThinkingReplay();
  const kimi = new KimiThinkingReplay();

  expect(claude.commit('shared-model', 'execution', turn('claude-signature'))).toBe(true);
  expect(kimi.commit('shared-model', 'execution', turn('kimi-signature'))).toBe(true);

  const claudeHeld = claude.totalBytes();
  const kimiHeld = kimi.totalBytes();

  expect(claudeHeld).toBeGreaterThan(0);
  expect(kimiHeld).toBeGreaterThan(0);

  claude.clearAll();

  expect(claude.totalBytes()).toBe(0);
  expect(kimi.totalBytes()).toBe(kimiHeld);
});

function turn(signature: string) {
  return [
    { type: 'thinking', thinking: 'reasoning', signature },
    { type: 'tool_use', id: 'toolu_1', name: 'Read', input: { path: 'README.md' } },
  ];
}
