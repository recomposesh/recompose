import type { AccountBalance } from '@recompose/contracts';

import { expect, test } from 'vitest';

import { balanceFaceOf } from './balance-faces';

const NOW = Date.UTC(2026, 8, 14, 12, 0);
const A_MINUTE = 60_000;

const read: AccountBalance = {
  accountId: 'build',
  reading: { remaining: 37.71, added: 100, spent: 62.29, readAt: NOW - 3 * A_MINUTE },
};

test('the balance headlines what is left rather than what was bought', () => {
  expect(balanceFaceOf(read, NOW).remaining).toBe('$37.71');
});

test('what was added and what was spent both print, so the headline can be checked', () => {
  expect(balanceFaceOf(read, NOW).detail).toBe('$100.00 added · $62.29 spent');
});

test('the reading prints beside the instant it was taken, never as a live counter', () => {
  expect(balanceFaceOf(read, NOW).stamp).toBe('Read 3m ago');
});

test('an account spent past what it added reads its overdraft rather than a floor of zero', () => {
  const overdrawn: AccountBalance = {
    accountId: 'build',
    reading: { remaining: -2.5, added: 10, spent: 12.5, readAt: NOW },
  };

  expect(balanceFaceOf(overdrawn, NOW).remaining).toBe('-$2.50');
});

test('a failed read keeps the last reading and its stamp, so no stale figure poses as fresh', () => {
  const stale: AccountBalance = { ...read, failure: 'OpenRouter could not be reached.' };
  const face = balanceFaceOf(stale, NOW);

  expect(face.remaining).toBe('$37.71');
  expect(face.stamp).toBe('Read 3m ago');
  expect(face.failure).toBe('OpenRouter could not be reached.');
});

test('a read that never landed prints no figure at all rather than an empty wallet', () => {
  const never: AccountBalance = { accountId: 'build', failure: 'OpenRouter could not be reached.' };
  const face = balanceFaceOf(never, NOW);

  expect(face.remaining).toBe('—');
  expect(face.detail).toBeUndefined();
  expect(face.stamp).toBeUndefined();
});

test('a reading that held carries no failure sentence', () => {
  expect(balanceFaceOf(read, NOW).failure).toBeUndefined();
});

test('the card keeps the account it stands for, so a row can find its own', () => {
  expect(balanceFaceOf(read, NOW).accountId).toBe('build');
});

test('a sub-cent remainder still prints its cents rather than rounding away', () => {
  const nearlySpent: AccountBalance = {
    accountId: 'build',
    reading: { remaining: 0.01, added: 5, spent: 4.99, readAt: NOW },
  };

  expect(balanceFaceOf(nearlySpent, NOW).remaining).toBe('$0.01');
});

test('a balance a rounding put a hair under zero prints as zero, never as a debt', () => {
  const face = balanceFaceOf(
    { accountId: 'aggregator', reading: { remaining: -0.0, added: 5, spent: 5.0001, readAt: NOW } },
    NOW,
  );

  expect(face.remaining).toBe('$0.00');
});

test('a balance a vendor counted in another currency prints under that sign', () => {
  const face = balanceFaceOf(
    { accountId: 'kimi', reading: { remaining: 40, currency: 'CNY', readAt: NOW } },
    NOW,
  );

  expect(face.remaining).toBe('CN¥40.00');
});

test('a balance naming no currency prints in dollars, which is what most vendors count', () => {
  const face = balanceFaceOf(
    { accountId: 'router', reading: { remaining: 12.5, readAt: NOW } },
    NOW,
  );

  expect(face.remaining).toBe('$12.50');
});
