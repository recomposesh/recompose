import type { QuotaWindow } from '@recompose/contracts';

import { expect, test } from 'vitest';

import { quotaGaugesOf } from './quota-gauges';

const AUGUST_THIRD = Date.UTC(2026, 7, 3, 9, 0);
const NOW = Date.UTC(2026, 8, 14, 12, 0);
const AN_HOUR = 3_600_000;
const A_MINUTE = 60_000;

function openWindow(patch: Partial<QuotaWindow> = {}): QuotaWindow {
  return {
    accountId: 'work',
    provider: 'anthropic',
    length: '5h',
    openedAt: NOW - AN_HOUR,
    closesAt: NOW + 2 * AN_HOUR + 14 * A_MINUTE,
    burnTokens: 1_200_000,
    record: { burnTokens: 2_000_000, openedAt: AUGUST_THIRD },
    ...patch,
  };
}

function onlyGauge(window: QuotaWindow, now = NOW) {
  const [account] = quotaGaugesOf([window], now);
  const gauge = account?.gauges[0];

  if (gauge === undefined) {
    throw new Error('The window folded to no gauge at all.');
  }

  return gauge;
}

test('a burn draws on a track the record sits inside, so the fill never reaches the end', () => {
  const gauge = onlyGauge(openWindow());

  expect(gauge.share).toBeCloseTo(0.48);
  expect(gauge.marker).toBe(0.8);
});

test('the record prints its own figure and the day it was set', () => {
  expect(onlyGauge(openWindow()).standing).toBe('Record 2.0M on Aug 3');
});

test('a window that beats every earlier one says so instead of filling the track', () => {
  const gauge = onlyGauge(
    openWindow({
      burnTokens: 2_000_000,
      record: { burnTokens: 2_000_000, openedAt: NOW - AN_HOUR },
    }),
  );

  expect(gauge.standing).toBe('Busiest window on record');
  expect(gauge.share).toBeLessThan(1);
});

test('an account with nothing on record carries its burn without a gauge to measure it', () => {
  const gauge = onlyGauge(openWindow({ record: undefined }));

  expect(gauge.marker).toBeUndefined();
  expect(gauge.standing).toBe('No window on record yet');
});

test('a burn prints as a compact token count beside its gauge', () => {
  expect(onlyGauge(openWindow()).burn).toBe('1.2M');
});

test('the five-hour countdown reads as approximate, because the anchor is inferred', () => {
  expect(onlyGauge(openWindow()).countdown).toBe('Closes in ≈2h 14m');
});

test('a countdown landing on the hour drops the empty minutes', () => {
  expect(onlyGauge(openWindow({ closesAt: NOW + 2 * AN_HOUR })).countdown).toBe('Closes in ≈2h');
});

test('a countdown under an hour reads in minutes alone', () => {
  expect(onlyGauge(openWindow({ closesAt: NOW + 14 * A_MINUTE })).countdown).toBe('Closes in ≈14m');
});

test('a countdown inside its last minute still rounds up to a minute rather than to nothing', () => {
  expect(onlyGauge(openWindow({ closesAt: NOW + 12_000 })).countdown).toBe('Closes in ≈1m');
});

test('the weekly gauge shows its burn with no countdown, because no honest weekly close exists', () => {
  const gauge = onlyGauge(openWindow({ length: 'week', openedAt: undefined, closesAt: undefined }));

  expect(gauge.countdown).toBeUndefined();
  expect(gauge.lengthLabel).toBe('Weekly window');
});

test('a five-hour window nobody has opened yet carries no countdown either', () => {
  expect(
    onlyGauge(openWindow({ burnTokens: 0, openedAt: undefined, closesAt: undefined })).countdown,
  ).toBeUndefined();
});

test('the five-hour gauge names the length it stands for', () => {
  expect(onlyGauge(openWindow()).lengthLabel).toBe('5-hour window');
});

test('both lengths of one account fold into a single card, in the order they arrived', () => {
  const folded = quotaGaugesOf(
    [openWindow(), openWindow({ length: 'week', openedAt: undefined, closesAt: undefined })],
    NOW,
  );

  expect(folded).toHaveLength(1);
  expect(folded[0]?.accountId).toBe('work');
  expect(folded[0]?.gauges.map((gauge) => gauge.length)).toEqual(['5h', 'week']);
});

test('two accounts keep their own cards rather than sharing one', () => {
  const folded = quotaGaugesOf([openWindow(), openWindow({ accountId: 'personal' })], NOW);

  expect(folded.map((account) => account.accountId)).toEqual(['work', 'personal']);
});

test('a record that burned nothing counts as nothing on record, never as a window matched', () => {
  const gauge = onlyGauge(
    openWindow({ burnTokens: 0, record: { burnTokens: 0, openedAt: AUGUST_THIRD } }),
  );

  expect(gauge.marker).toBeUndefined();
  expect(gauge.share).toBe(0);
  expect(gauge.standing).toBe('No window on record yet');
});
