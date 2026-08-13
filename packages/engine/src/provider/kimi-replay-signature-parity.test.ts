import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { replayableThinkingContent } from './kimi-thinking-replay';

describe('a thinking turn offered to the Kimi replay store', () => {
  it('should replay a turn whose signature has the shape Kimi produces', () => {
    expect(replayableThinkingContent(turn(nativeKimiSignature()), 'kimi')).toBe(true);
  });

  it('should refuse a turn carrying another provider a signature', () => {
    expect(replayableThinkingContent(turn('claude#EqQBCkYIBxgCKkA'), 'kimi')).toBe(false);
  });

  it('should refuse a turn whose signature is any non-blank string at all', () => {
    expect(replayableThinkingContent(turn('not-a-signature'), 'kimi')).toBe(false);
  });

  it('should leave another target judging its own signature further down the wire', () => {
    expect(replayableThinkingContent(turn('claude#EqQBCkYIBxgCKkA'), 'other')).toBe(true);
  });
});

function turn(signature: string) {
  return [
    { type: 'thinking', thinking: 'reasoning', signature },
    { type: 'tool_use', id: 'toolu_1', name: 'Read', input: { path: 'README.md' } },
  ];
}

function nativeKimiSignature(): string {
  const bytes = Buffer.alloc(3255);
  let filled = 0;
  let counter = 0;

  while (filled < bytes.length) {
    const block = createHash('sha256')
      .update(`kimi-${String(counter++)}`)
      .digest();
    const taken = Math.min(block.length, bytes.length - filled);

    block.copy(bytes, filled, 0, taken);
    filled += taken;
  }

  return bytes.toString('base64').replace(/=+$/u, '');
}
