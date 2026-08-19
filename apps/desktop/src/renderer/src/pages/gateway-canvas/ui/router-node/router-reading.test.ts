import { describe, expect, test } from 'vitest';

import { branchTally, childTally } from './router-reading';

describe('how many children a router says it holds', () => {
  test('a router holding none says so in words rather than counting to zero', () => {
    expect(childTally(0)).toBe('no child');
  });

  test('one child reads singular, and more than one reads plural', () => {
    expect(childTally(1)).toBe('1 child');
    expect(childTally(4)).toBe('4 children');
  });
});

describe('what a router the judge decides says it holds', () => {
  test('the count says branches, because every child a rule names is one', () => {
    expect(branchTally(2, 'advisor')).toBe('2 branches, one judge');
    expect(branchTally(1, 'advisor')).toBe('1 branch, one judge');
  });

  test('a router holding no rule yet says so in words rather than counting to zero', () => {
    expect(branchTally(0, 'advisor')).toBe('no branch, one judge');
  });

  test('a judge no table holds reads as absent, because every request then lands on else', () => {
    expect(branchTally(2, undefined)).toBe('2 branches, no judge');
  });
});
