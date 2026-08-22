import { expect, test } from 'vitest';

import { discoveryHint, discoverySuggestion } from './draft-refusals';

test("an id Claude Code's picker skips carries the hint that says so", () => {
  expect(discoveryHint('fast')).toContain('claude');
});

test("an id Claude Code's picker surfaces carries no hint", () => {
  expect(discoveryHint('claude-fast')).toBeUndefined();
  expect(discoveryHint('anthropic-fast')).toBeUndefined();
});

test('an id carrying the word anywhere but its opening is surfaced too, so it stays quiet', () => {
  expect(discoveryHint('fast-claude')).toBeUndefined();
  expect(discoveryHint('my-anthropic-router')).toBeUndefined();
});

test('the hint offers the id that would be surfaced, so the fix is one press away', () => {
  expect(discoverySuggestion('fast')).toBe('claude-fast');
});

test('an id already surfaced is offered nothing, because it has nothing to take', () => {
  expect(discoverySuggestion('claude-fast')).toBeUndefined();
  expect(discoverySuggestion('fast-claude')).toBeUndefined();
});

test('an id with nothing in it is offered nothing, because a bare prefix serves no request', () => {
  expect(discoveryHint('')).toBeUndefined();
  expect(discoverySuggestion('')).toBeUndefined();
});
