import { describe, expect, test } from 'vitest';

import { compiledJudgePrompt, previewedJudgePrompt } from './judge-prompt';

const BRANCHES = [
  { label: 'code', rule: 'asks to write or change code' },
  { label: 'chat', rule: 'small talk and questions' },
];

const DIRECTIVE = 'A stack trace is code however politely it is asked about.';

/** The lines a preview adds to the wire prompt, which is where a real request would have stood. */
function beyondTheWire(brief: Parameters<typeof previewedJudgePrompt>[0]): string[] {
  const wire = compiledJudgePrompt(brief).split('\n');

  return previewedJudgePrompt(brief)
    .split('\n')
    .filter((line) => !wire.includes(line));
}

describe('the prompt a person reads in the panel', () => {
  test('names the slot a request fills, so nobody mistakes the tail for the whole thing', () => {
    expect(previewedJudgePrompt({ branches: BRANCHES })).toContain('{REQUEST}');
  });

  test('reads the branches a router actually holds, in the order they were declared', () => {
    const shown = previewedJudgePrompt({ branches: BRANCHES });

    expect(shown).toContain('code: asks to write or change code');
    expect(shown).toContain('chat: small talk and questions');
    expect(shown.indexOf('code:')).toBeLessThan(shown.indexOf('chat:'));
  });

  test('says a branch list holding nothing yet holds nothing, rather than printing a gap', () => {
    const shown = previewedJudgePrompt({ branches: [] });

    expect(shown).toContain('Branches:\n{BRANCHES}\n');
    expect(shown).not.toContain('Branches:\n\n');
  });

  test('a router that holds branches never prints the empty-list placeholder', () => {
    expect(previewedJudgePrompt({ branches: BRANCHES })).not.toContain('{BRANCHES}');
  });

  test('carries the directive a person wrote, exactly where the judge will meet it', () => {
    const shown = previewedJudgePrompt({ branches: BRANCHES, directive: DIRECTIVE });

    expect(shown).toContain(DIRECTIVE);
    expect(shown.indexOf(DIRECTIVE)).toBeLessThan(shown.indexOf('Branches:'));
  });
});

describe('what the panel and the wire share', () => {
  test('every wire line stands in the preview, so the panel never softens the instruction', () => {
    const wire = compiledJudgePrompt({ branches: BRANCHES, directive: DIRECTIVE });
    const shown = previewedJudgePrompt({ branches: BRANCHES, directive: DIRECTIVE });

    for (const line of wire.split('\n')) {
      expect(shown).toContain(line);
    }
  });

  test('the preview adds the request slot and nothing else to a router holding branches', () => {
    expect(beyondTheWire({ branches: BRANCHES })).toEqual(['{REQUEST}']);
  });

  test('the request slot stands last, where the caller words arrive', () => {
    const lines = previewedJudgePrompt({ branches: BRANCHES }).split('\n');

    expect(lines.at(-1)).toBe('{REQUEST}');
  });

  test('a preview never reaches the wire: the judge is handed no placeholder', () => {
    const wire = compiledJudgePrompt({ branches: [] });

    expect(wire).not.toContain('{REQUEST}');
    expect(wire).not.toContain('{BRANCHES}');
  });
});
