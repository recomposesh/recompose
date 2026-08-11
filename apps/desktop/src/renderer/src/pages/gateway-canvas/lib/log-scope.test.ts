import type { LogRow } from '@recompose/contracts';

import { fc, test as propertyTest } from '@fast-check/vitest';
import { expect, test } from 'vitest';

import type { LogSubject } from './log-scope';

import { logScope } from './log-scope';

const CLIENT_KEY = `sha256:${'a'.repeat(64)}`;

type RowStanding = {
  status?: number;
  origin?: LogRow['origin'];
  virtualModel?: string;
  accountId?: string;
};

function row(id: string, standing: RowStanding): LogRow {
  const { status = 200, origin = 'provider', ...reached } = standing;

  return {
    id,
    at: 0,
    gateway: 'main',
    origin,
    method: 'POST',
    status,
    durationMs: 12,
    clientKey: CLIENT_KEY,
    ...reached,
  };
}

const throughFast = row('through-fast', { virtualModel: 'fast', accountId: 'work' });
const throughDeep = row('through-deep', { virtualModel: 'deep', accountId: 'home' });
const refusedThroughFast = row('refused-through-fast', {
  virtualModel: 'fast',
  accountId: 'work',
  status: 429,
});
const raisedByTheGateway = row('raised-by-the-gateway', { origin: 'gateway', status: 502 });

const everyRow = [throughFast, throughDeep, refusedThroughFast, raisedByTheGateway];

const anyRow = fc
  .record(
    {
      id: fc.string({ minLength: 1 }),
      status: fc.integer({ min: 100, max: 599 }),
      virtualModel: fc.constantFrom('fast', 'deep'),
      accountId: fc.constantFrom('work', 'home'),
    },
    { requiredKeys: ['id', 'status'] },
  )
  .map(({ id, ...standing }) => row(id, standing));

const anySubject: fc.Arbitrary<LogSubject> = fc.oneof(
  fc.constant<LogSubject>({ kind: 'gateway' }),
  fc.constant<LogSubject>({ kind: 'draft' }),
  fc
    .constantFrom('fast', 'deep')
    .map((modelId): LogSubject => ({ kind: 'virtual-model', modelId })),
  fc.constantFrom('fast', 'deep').map((modelId): LogSubject => ({ kind: 'cable', modelId })),
  fc.constantFrom('work', 'home').map((accountId): LogSubject => ({ kind: 'target', accountId })),
  fc
    .constantFrom('work', 'home')
    .map((accountId): LogSubject => ({ kind: 'ghost-target', accountId })),
);

function standsWithin(narrow: readonly LogRow[], wide: readonly LogRow[]): boolean {
  const held = new Set(wide);

  return narrow.every((scoped) => held.has(scoped));
}

test('the gateway shows every request any client app made', () => {
  expect(everyRow.filter(logScope({ kind: 'gateway' }, false))).toEqual(everyRow);
});

test('a draft nobody has settled yet shows every request, the way the gateway does', () => {
  expect(everyRow.filter(logScope({ kind: 'draft' }, false))).toEqual(everyRow);
});

test('a selected virtual model shows the requests that passed through it', () => {
  expect(everyRow.filter(logScope({ kind: 'virtual-model', modelId: 'fast' }, false))).toEqual([
    throughFast,
    refusedThroughFast,
  ]);
});

test('a selected cable shows the requests of the virtual model it binds', () => {
  expect(everyRow.filter(logScope({ kind: 'cable', modelId: 'deep' }, false))).toEqual([
    throughDeep,
  ]);
});

test('a selected target shows the requests that reached it', () => {
  expect(everyRow.filter(logScope({ kind: 'target', accountId: 'home' }, false))).toEqual([
    throughDeep,
  ]);
});

test('a removed target shows the requests that reached the identity it left behind', () => {
  expect(everyRow.filter(logScope({ kind: 'ghost-target', accountId: 'work' }, false))).toEqual([
    throughFast,
    refusedThroughFast,
  ]);
});

test('a request the gateway refused before any target answered reaches no target scope', () => {
  const reachedWork = everyRow.filter(logScope({ kind: 'target', accountId: 'work' }, false));

  expect(reachedWork).not.toContain(raisedByTheGateway);
});

test('the errors toggle leaves the gateway showing the failed requests alone', () => {
  expect(everyRow.filter(logScope({ kind: 'gateway' }, true))).toEqual([
    refusedThroughFast,
    raisedByTheGateway,
  ]);
});

test('the errors toggle narrows whatever scope stands rather than replacing it', () => {
  expect(everyRow.filter(logScope({ kind: 'virtual-model', modelId: 'fast' }, true))).toEqual([
    refusedThroughFast,
  ]);
});

test('a request answered at 400 reads as an error and one answered at 399 does not', () => {
  const answers = [row('refused', { status: 400 }), row('redirected', { status: 399 })];

  expect(answers.filter(logScope({ kind: 'gateway' }, true))).toEqual([answers[0]]);
});

propertyTest.prop([fc.array(anyRow, { maxLength: 24 }), anySubject, fc.boolean()])(
  'every scope shows a part of what the gateway shows, never a request beyond it',
  (rows, subject, errorsOnly) => {
    const scoped = rows.filter(logScope(subject, errorsOnly));

    expect(standsWithin(scoped, rows.filter(logScope({ kind: 'gateway' }, false)))).toBe(true);
  },
);

propertyTest.prop([fc.array(anyRow, { maxLength: 24 }), anySubject])(
  'the errors toggle only ever takes requests away from a scope',
  (rows, subject) => {
    const narrowed = rows.filter(logScope(subject, true));

    expect(standsWithin(narrowed, rows.filter(logScope(subject, false)))).toBe(true);
  },
);
