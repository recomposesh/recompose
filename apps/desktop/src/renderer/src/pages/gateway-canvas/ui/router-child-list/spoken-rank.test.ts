import { expect, test } from 'vitest';

import { spokenRank, spokenSubject } from './spoken-rank';

test('a moved row lands on a rank said in words rather than digits', () => {
  expect(spokenRank(2, 3)).toBe('second of three');
});

test('a ladder longer than the words carry falls back to digits nobody has to have a word for', () => {
  expect(spokenRank(12, 14)).toBe('12 of 14');
});

test('a child with no branch above it is called out by the account behind it', () => {
  expect(spokenSubject({ name: 'Work key' })).toBe('Work key');
});

test('a branch is called out by the word the judge answers with, never by the account', () => {
  expect(spokenSubject({ name: 'Work key', label: 'code' })).toBe('the code branch');
});

test('a branch whose label is only spaces is called out by its account instead', () => {
  expect(spokenSubject({ name: 'Work key', label: '   ' })).toBe('Work key');
});
