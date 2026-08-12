import { expect, test } from 'vitest';

import { compactCount, exactCount, pluralized, readDuration } from './readings';

test('a count the cell can hold in full reads in full', () => {
  expect(compactCount(999)).toBe('999');
});

test('a count past a thousand reads compact with one decimal, so the cell keeps its width', () => {
  expect(compactCount(18_234)).toBe('18.2k');
});

test('a thousand exactly reads compact too, because it is already four digits wide', () => {
  expect(compactCount(1_000)).toBe('1.0k');
});

test('a count past a million climbs the ladder rather than printing thousands of k', () => {
  expect(compactCount(45_000_000)).toBe('45.0M');
});

test('a million exactly crosses into the next magnitude', () => {
  expect(compactCount(1_000_000)).toBe('1.0M');
});

test('a count past a billion reads in billions, so a long month never overflows its cell', () => {
  expect(compactCount(2_100_000_000)).toBe('2.1B');
});

test('a headline reads the exact count with grouping, because the one big number is the point', () => {
  expect(exactCount(45_123_456)).toBe('45,123,456');
});

test('a headline small enough to read plain carries no separator', () => {
  expect(exactCount(999)).toBe('999');
});

test('a quiet minute reads no latency rather than leaving the cell blank', () => {
  expect(readDuration(0)).toBe('0ms');
});

test('a latency under a second reads in milliseconds', () => {
  expect(readDuration(420)).toBe('420ms');
});

test('a latency of a second and over reads in seconds with one decimal', () => {
  expect(readDuration(1_100)).toBe('1.1s');
});

test('a second exactly crosses into seconds rather than reading a thousand milliseconds', () => {
  expect(readDuration(1_000)).toBe('1.0s');
});

test('a fraction of a millisecond rounds, so the cell never prints a tail', () => {
  expect(readDuration(420.6)).toBe('421ms');
});

test('one of a thing reads singular, so the strip never says one client apps', () => {
  expect(pluralized(1, 'client app')).toBe('client app');
});

test('none of a thing reads plural, which is how a zeroed strip reads', () => {
  expect(pluralized(0, 'client app')).toBe('client apps');
});

test('many of a thing read plural', () => {
  expect(pluralized(3, 'error')).toBe('errors');
});
