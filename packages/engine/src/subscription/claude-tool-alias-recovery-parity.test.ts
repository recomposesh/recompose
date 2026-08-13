import { describe, expect, it } from 'vitest';

import { restoredToolNames } from './claude-tool-response';

const RESTORE = { mcp__abc123__def456_read_file: 'Read' };

describe('a tool name coming back from an upstream that altered the alias', () => {
  it('should recover a name whose alias lost its semantic tail', () => {
    expect(restoredName('mcp__abc123__def456')).toBe('Read');
  });

  it('should recover a name whose alias was truncated mid tail', () => {
    expect(restoredName('mcp__abc123__def456_read')).toBe('Read');
  });

  it('should leave an unrelated tool name alone', () => {
    expect(restoredName('mcp__other__tool_thing')).toBe('mcp__other__tool_thing');
  });

  it('should refuse a recovery that two aliases could both claim', () => {
    const ambiguous = {
      mcp__abc123__def456_read_file: 'Read',
      mcp__abc123__def456_read_lines: 'ReadLines',
    };

    expect(restoredToolNames('mcp__abc123__def456', ambiguous)).toBe('mcp__abc123__def456');
  });
});

function restoredName(name: string): string {
  return restoredToolNames(name, RESTORE);
}
