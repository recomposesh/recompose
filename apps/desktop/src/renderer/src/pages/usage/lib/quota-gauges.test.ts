import type { Account, QuotaWindow } from '@recompose/contracts';

import { expect, test } from 'vitest';

import { quotaCardsOf, quotaGaugesOf } from './quota-gauges';

const AUGUST_THIRD = new Date(2026, 7, 3, 9, 0).getTime();
const NOW = new Date(2026, 8, 14, 12, 0).getTime();
const THIS_AFTERNOON = new Date(2026, 8, 14, 15, 30).getTime();
const NEXT_WEEK = new Date(2026, 8, 17, 15, 0).getTime();
const AN_HOUR = 3_600_000;

function openWindow(patch: Partial<QuotaWindow> = {}): QuotaWindow {
  return {
    accountId: 'work',
    provider: 'anthropic',
    length: '5h',
    openedAt: NOW - AN_HOUR,
    closesAt: THIS_AFTERNOON,
    burnTokens: 1_200_000,
    record: { burnTokens: 2_000_000, openedAt: AUGUST_THIRD },
    ...patch,
  };
}

function vendorRead(patch: Partial<QuotaWindow> = {}): QuotaWindow {
  return openWindow({
    reported: { spentShare: 0.23, readAt: NOW, resetsAt: THIS_AFTERNOON },
    ...patch,
  });
}

function onlyGauge(window: QuotaWindow, now = NOW) {
  const [account] = quotaGaugesOf([window], now);
  const gauge = account?.gauges[0];

  if (gauge === undefined) {
    throw new Error('The window folded to no gauge at all.');
  }

  return gauge;
}

test('a burn nobody set a limit for draws no track, since a track would invent a limit', () => {
  const gauge = onlyGauge(openWindow());

  expect(gauge.share).toBeUndefined();
});

test('a window that beat its own record still draws no track, so it never reads as exhausted', () => {
  const gauge = onlyGauge(
    openWindow({
      burnTokens: 9_000_000,
      record: { burnTokens: 2_000_000, openedAt: AUGUST_THIRD },
    }),
  );

  expect(gauge.share).toBeUndefined();
  expect(gauge.headline).toBe('9.0M sent');
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
});

test('an account with nothing on record prints no standing line rather than an empty one', () => {
  const gauge = onlyGauge(openWindow({ record: undefined }));

  expect(gauge.share).toBeUndefined();
  expect(gauge.standing).toBeUndefined();
});

test('a window nobody but this machine measured heads with what it sent, said as sent', () => {
  expect(onlyGauge(openWindow()).headline).toBe('1.2M sent');
});

test('an inferred reset names its hour, and wears the mark that says nobody vouched for it', () => {
  expect(onlyGauge(openWindow()).countdown).toBe('Resets at ~3:30 PM');
});

test('an inferred reset on a later day names that day, since an hour alone reads as today', () => {
  expect(onlyGauge(openWindow({ closesAt: NEXT_WEEK })).countdown).toBe('Resets Thu at ~3:00 PM');
});

test('the weekly gauge shows its burn with no reset, because no honest weekly boundary exists', () => {
  const gauge = onlyGauge(openWindow({ length: 'week', openedAt: undefined, closesAt: undefined }));

  expect(gauge.countdown).toBeUndefined();
  expect(gauge.lengthLabel).toBe('Current week');
});

test('a five-hour window nobody has opened yet carries no reset either', () => {
  expect(
    onlyGauge(openWindow({ burnTokens: 0, openedAt: undefined, closesAt: undefined })).countdown,
  ).toBeUndefined();
});

test('the five-hour gauge names the window a person sends through as their session', () => {
  expect(onlyGauge(openWindow()).lengthLabel).toBe('Current session');
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

test('each card carries the provider its windows named, so the strip can say whose plan burns', () => {
  const folded = quotaGaugesOf(
    [openWindow(), openWindow({ accountId: 'personal', provider: 'openai' })],
    NOW,
  );

  expect(folded.map((account) => account.provider)).toEqual(['anthropic', 'openai']);
});

test('a record that burned nothing counts as nothing on record, never as a window matched', () => {
  const gauge = onlyGauge(
    openWindow({ burnTokens: 0, record: { burnTokens: 0, openedAt: AUGUST_THIRD } }),
  );

  expect(gauge.share).toBeUndefined();
  expect(gauge.standing).toBeUndefined();
});

test('a window the vendor measured heads with the share of the plan it says is spent', () => {
  expect(onlyGauge(vendorRead()).headline).toBe('23% used');
});

test('a share the vendor read to a fraction of a percent prints as a whole percent', () => {
  const gauge = onlyGauge(vendorRead({ reported: { spentShare: 0.235, readAt: NOW } }));

  expect(gauge.headline).toBe('24% used');
});

test('a vendor share draws a track, since the vendor named the limit the track ends at', () => {
  expect(onlyGauge(vendorRead()).share).toBeCloseTo(0.23);
});

test('a vendor reading keeps the local burn under it, said as what this machine sent', () => {
  expect(onlyGauge(vendorRead()).standing).toBe('1.2M through this machine');
});

test('a vendor reset names its hour, without the mark an inferred one earns', () => {
  expect(onlyGauge(vendorRead()).countdown).toBe('Resets at 3:30 PM');
});

test('a weekly reset names its day and hour, because a span of days tells nobody anything', () => {
  const gauge = onlyGauge(
    vendorRead({
      length: 'week',
      openedAt: undefined,
      closesAt: undefined,
      reported: { spentShare: 0.23, readAt: NOW, resetsAt: NEXT_WEEK },
    }),
  );

  expect(gauge.countdown).toBe('Resets Thu at 3:00 PM');
  expect(gauge.headline).toBe('23% used');
});

test('a vendor reading that named no reset falls back on nothing rather than on the local one', () => {
  expect(
    onlyGauge(openWindow({ reported: { spentShare: 0.5, readAt: NOW } })).countdown,
  ).toBeUndefined();
});

test('a plan the vendor says is spent draws a full track rather than one that stops short', () => {
  const gauge = onlyGauge(vendorRead({ reported: { spentShare: 1, readAt: NOW } }));

  expect(gauge.share).toBe(1);
  expect(gauge.headline).toBe('100% used');
});

const signedIn: Account[] = [
  {
    id: 'work',
    kind: 'subscription',
    provider: 'anthropic',
    label: 'work@example.com',
    provenance: 'sign-in',
  },
  {
    id: 'quiet',
    kind: 'subscription',
    provider: 'openai',
    label: 'quiet@example.com',
    provenance: 'sign-in',
  },
  { id: 'keyed', kind: 'api-key', provider: 'groq', label: 'a key', credentialRef: 'r1' },
];

test('every signed-in plan carries a card, whether or not this machine has served it', () => {
  const cards = quotaCardsOf(signedIn, [openWindow()], NOW);

  expect(cards.map((card) => card.accountId)).toEqual(['work', 'quiet']);
});

test('a plan nothing has been served through yet carries no gauges to draw', () => {
  const cards = quotaCardsOf(signedIn, [openWindow()], NOW);

  expect(cards[1]?.gauges).toEqual([]);
});

test('a plan the registry no longer holds keeps its card, since its burn is still on record', () => {
  const cards = quotaCardsOf([], [openWindow()], NOW);

  expect(cards.map((card) => card.accountId)).toEqual(['work']);
});
