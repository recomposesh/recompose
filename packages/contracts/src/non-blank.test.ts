import { describe, expect, test } from 'vitest';

import { nonBlankString } from './non-blank';

describe('a string carrying padding around its words', () => {
  test('parses to the words alone, shedding the padding', () => {
    expect(nonBlankString.parse('  work key  ')).toBe('work key');
  });
});

describe('a string holding nothing but whitespace', () => {
  test('refuses as blank, saying so', () => {
    const read = nonBlankString.safeParse('   ');

    expect(read.success).toBe(false);
    expect(read.error?.issues[0]?.message).toBe('must not be blank');
  });
});

describe('an empty string', () => {
  test('refuses as blank', () => {
    expect(nonBlankString.safeParse('').success).toBe(false);
  });
});
