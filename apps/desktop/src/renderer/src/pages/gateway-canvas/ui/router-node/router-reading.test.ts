import { describe, expect, test } from 'vitest';

import { branchTally, childTally, standsIncomplete } from './router-reading';

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

describe('when a router card says it is unfinished', () => {
  const judged = { branches: 2, judge: 'advisor', judgeAnswers: true };

  test('a router holding no child is unfinished, whatever else stands', () => {
    expect(standsIncomplete(0, undefined)).toBe(true);
  });

  test('a router spreading over children it holds is finished', () => {
    expect(standsIncomplete(2, undefined)).toBe(false);
  });

  test('a conditional router whose judge answers is finished like any other', () => {
    expect(standsIncomplete(2, judged)).toBe(false);
  });

  test('a conditional router whose judge lost its account is unfinished, however many children', () => {
    expect(standsIncomplete(2, { ...judged, judgeAnswers: false })).toBe(true);
  });

  test('a judge no table holds leaves the router unfinished, since every request lands on else', () => {
    expect(standsIncomplete(2, { ...judged, judge: undefined, judgeAnswers: false })).toBe(true);
  });
});
