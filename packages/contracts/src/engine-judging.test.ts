import { expect, test } from 'vitest';

import { engineJudgingReportSchema, gatewayJudgingSchema } from './engine-judging';

const aReport = {
  kind: 'judging',
  slug: 'codex',
  virtualModel: 'fast',
  routeNode: 'r1',
  judging: 1,
};

test('a report says which router is waiting and on how many requests', () => {
  expect(engineJudgingReportSchema.parse(aReport)).toEqual(aReport);
});

test('a router waiting on nothing is a reading of its own, because it is how a pulse stops', () => {
  expect(engineJudgingReportSchema.parse({ ...aReport, judging: 0 }).judging).toBe(0);
});

test('a count below zero is refused, because no router waits on less than nothing', () => {
  expect(() => engineJudgingReportSchema.parse({ ...aReport, judging: -1 })).toThrow();
});

test('a report carrying anything the caller wrote is refused at the boundary', () => {
  expect(() => engineJudgingReportSchema.parse({ ...aReport, tail: 'rename this' })).toThrow();
});

test('a report naming no router is refused, because a tie belongs to one', () => {
  expect(() => engineJudgingReportSchema.parse({ ...aReport, routeNode: '' })).toThrow();
});

test('the snapshot keys a count by gateway, then virtual model, then route node', () => {
  const snapshot = { codex: { fast: { r1: 2 } } };

  expect(gatewayJudgingSchema.parse(snapshot)).toEqual(snapshot);
});

test('a snapshot keyed by something no gateway could be named is refused', () => {
  expect(() => gatewayJudgingSchema.parse({ UPPER: { fast: { r1: 1 } } })).toThrow();
});
