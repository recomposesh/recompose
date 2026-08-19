import { describe, expect, test } from 'vitest';

import { compiledJudgePrompt } from './judge-prompt';

const BRANCHES = [
  { label: 'code', rule: 'asks to write or change code' },
  { label: 'chat', rule: 'small talk and questions' },
];

const DIRECTIVE = 'A stack trace is code however politely it is asked about.';

describe('the prompt a conditional router compiles for its judge', () => {
  test('names every branch beside the rule a person wrote for it', () => {
    const written = compiledJudgePrompt({ branches: BRANCHES });

    expect(written).toContain('code: asks to write or change code');
    expect(written).toContain('chat: small talk and questions');
  });

  test('keeps the branches in the order they were declared', () => {
    const written = compiledJudgePrompt({ branches: BRANCHES });

    expect(written.indexOf('code:')).toBeLessThan(written.indexOf('chat:'));
  });

  test('reads a directive ahead of the branches it steers', () => {
    const written = compiledJudgePrompt({ branches: BRANCHES, directive: DIRECTIVE });

    expect(written.indexOf(DIRECTIVE)).toBeGreaterThan(-1);
    expect(written.indexOf(DIRECTIVE)).toBeLessThan(written.indexOf('Branches:'));
  });

  test('closes the answer to one branch name, whatever a directive asks for', () => {
    const written = compiledJudgePrompt({
      branches: BRANCHES,
      directive: 'Explain your reasoning at length.',
    });

    expect(written).toContain(
      'Answer with exactly one branch name from this list and nothing else.',
    );
  });

  test('trims what a person typed, so stray spacing never reaches the judge', () => {
    const written = compiledJudgePrompt({
      branches: [{ label: '  code  ', rule: '  asks for code  ' }],
      directive: `  ${DIRECTIVE}  `,
    });

    expect(written).toContain('code: asks for code');
    expect(written).toContain(`\n${DIRECTIVE}\n`);
  });

  test('a router that wrote no directive compiles the prompt it always did', () => {
    expect(compiledJudgePrompt({ branches: BRANCHES, directive: '   ' })).toBe(
      compiledJudgePrompt({ branches: BRANCHES }),
    );
  });
});
