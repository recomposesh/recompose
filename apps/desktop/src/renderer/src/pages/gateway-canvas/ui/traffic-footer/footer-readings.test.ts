import { expect, test } from 'vitest';

import { compactCount, pluralized, readDuration } from './footer-readings';

test('a count the cell can hold in full reads in full', () => {
  expect(compactCount(999)).toBe('999');
});

test('a count past a thousand reads compact with one decimal, so the cell keeps its width', () => {
  expect(compactCount(18_234)).toBe('18.2k');
});

test('a thousand exactly reads compact too, because it is already four digits wide', () => {
  expect(compactCount(1_000)).toBe('1.0k');
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
