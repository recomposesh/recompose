import { expect, test } from 'vitest';

import { derivedBranchLabel } from './derived-branch-label';

test('a rule short enough to read as a label becomes the label whole', () => {
  expect(derivedBranchLabel('questions about billing', [])).toBe('questions about billing');
});

test('a longer rule is cut at a word, so the label never ends mid-word', () => {
  expect(derivedBranchLabel('questions about source code or build failures', [])).toBe(
    'questions about source',
  );
});

test('a rule opening on one long word is cut inside it, because there is no word to cut at', () => {
  expect(derivedBranchLabel('internationalizationandlocalization asks', [])).toBe(
    'internationalizationandl',
  );
});

test('the spacing a person typed collapses, so the judge reads one word between spaces', () => {
  expect(derivedBranchLabel('  questions   about\nbilling  ', [])).toBe('questions about billing');
});

test('a derived label a sibling already wears stands one word clear of it', () => {
  expect(derivedBranchLabel('questions about billing', ['questions about billing'])).toBe(
    'questions about billing 2',
  );
});

test('the next derivation clears both the word and the one that already stood clear', () => {
  expect(
    derivedBranchLabel('questions about billing', [
      'questions about billing',
      'questions about billing 2',
    ]),
  ).toBe('questions about billing 3');
});

test('a sibling label wearing spare spacing still counts as taken', () => {
  expect(derivedBranchLabel('questions about billing', ['  questions about billing  '])).toBe(
    'questions about billing 2',
  );
});

test('a sibling holding some other word leaves the derived label alone', () => {
  expect(derivedBranchLabel('questions about billing', ['code'])).toBe('questions about billing');
});
