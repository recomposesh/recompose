import type { GatewayCooldowns } from '@recompose/contracts';

import { expect, test } from 'vitest';

import type { NodePlace } from './judge-cooldown';

import { backUpClockAt, standsDownAt } from './judge-cooldown';

const JUDGE: NodePlace = { slug: 'codex', virtualModel: 'fast', routeNode: 'j1' };

const NOON = new Date(2026, 7, 20, 12, 0, 0).getTime();

const FIVE_PAST = new Date(2026, 7, 20, 12, 5, 0).getTime();

const standingDown: GatewayCooldowns = { codex: { fast: { j1: FIVE_PAST } } };

test('a judge nothing refused stands down at no moment at all', () => {
  expect(standsDownAt({}, JUDGE)).toBeUndefined();
});

test('a judge told to stand down carries the moment it is ready again', () => {
  expect(standsDownAt(standingDown, JUDGE)).toBe(FIVE_PAST);
});

test('a judge under some other model reads its own moment rather than a namesake', () => {
  expect(standsDownAt(standingDown, { ...JUDGE, virtualModel: 'slow' })).toBeUndefined();
});

test('a snapshot answering to a key no route node could be named answers nothing', () => {
  expect(standsDownAt(standingDown, { ...JUDGE, routeNode: 'constructor' })).toBeUndefined();
});

test('a cooling judge reads back as the clock time it is expected back by', () => {
  expect(backUpClockAt(standingDown, JUDGE, NOON)).toBe('12:05');
});

test('a judge whose window already passed reads back as nothing to wait on', () => {
  expect(backUpClockAt(standingDown, JUDGE, FIVE_PAST)).toBeUndefined();
});

test('a judge nothing refused reads back as nothing to wait on', () => {
  expect(backUpClockAt({}, JUDGE, NOON)).toBeUndefined();
});

test('the reading holds still, saying the same clock however long a person looks at it', () => {
  expect(backUpClockAt(standingDown, JUDGE, NOON + 60_000)).toBe(
    backUpClockAt(standingDown, JUDGE, NOON),
  );
});
