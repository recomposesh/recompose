import type { UpdateState } from '@recompose/contracts';

import { fc, test as propertyTest } from '@fast-check/vitest';
import { describe, expect, test } from 'vitest';

import { nextUpdateState, type UpdaterSignal } from './update-standing';

const quiet: UpdateState = { standing: 'quiet' };
const downloading: UpdateState = { standing: 'downloading', version: '0.4.0' };
const ready: UpdateState = { standing: 'ready', version: '0.4.0' };

const anySignal: fc.Arbitrary<UpdaterSignal> = fc.oneof(
  fc.constant<UpdaterSignal>({ kind: 'cancelled' }),
  fc.constant<UpdaterSignal>({ kind: 'failed', reason: 'feed refused' }),
  fc
    .constantFrom('0.4.0', '0.5.0')
    .map((version): UpdaterSignal => ({ kind: 'available', version })),
  fc
    .constantFrom('0.4.0', '0.5.0')
    .map((version): UpdaterSignal => ({ kind: 'downloaded', version })),
);

function folded(signals: readonly UpdaterSignal[]): UpdateState {
  return signals.reduce<UpdateState>((state, signal) => nextUpdateState(state, signal), quiet);
}

describe('a quiet channel', () => {
  test('starts downloading when a version turns up', () => {
    expect(nextUpdateState(quiet, { kind: 'available', version: '0.4.0' })).toEqual(downloading);
  });

  test('stays quiet through a failure and a cancellation', () => {
    expect(nextUpdateState(quiet, { kind: 'failed', reason: 'offline' })).toEqual(quiet);
    expect(nextUpdateState(quiet, { kind: 'cancelled' })).toEqual(quiet);
  });
});

describe('a downloading channel', () => {
  test('stands ready when the download lands', () => {
    expect(nextUpdateState(downloading, { kind: 'downloaded', version: '0.4.0' })).toEqual(ready);
  });

  test('returns to quiet on a failure or a cancellation', () => {
    expect(nextUpdateState(downloading, { kind: 'failed', reason: 'gone' })).toEqual(quiet);
    expect(nextUpdateState(downloading, { kind: 'cancelled' })).toEqual(quiet);
  });

  test('follows the newest announced version', () => {
    expect(nextUpdateState(downloading, { kind: 'available', version: '0.5.0' })).toEqual({
      standing: 'downloading',
      version: '0.5.0',
    });
  });
});

describe('a move that changes nothing hands back the very state it holds', () => {
  test('a failure on a quiet channel and a re-announced version keep their object', () => {
    expect(nextUpdateState(quiet, { kind: 'failed', reason: 'offline' })).toBe(quiet);
    expect(nextUpdateState(downloading, { kind: 'available', version: '0.4.0' })).toBe(downloading);
    expect(nextUpdateState(ready, { kind: 'downloaded', version: '0.5.0' })).toBe(ready);
  });
});

describe('a ready channel absorbs everything', () => {
  test('no signal moves it, pinned value by value', () => {
    expect(nextUpdateState(ready, { kind: 'available', version: '0.5.0' })).toEqual(ready);
    expect(nextUpdateState(ready, { kind: 'downloaded', version: '0.5.0' })).toEqual(ready);
    expect(nextUpdateState(ready, { kind: 'cancelled' })).toEqual(ready);
    expect(nextUpdateState(ready, { kind: 'failed', reason: 'late' })).toEqual(ready);
  });

  test('the first landed version survives a whole later history, pinned with fixed values', () => {
    const history: readonly UpdaterSignal[] = [
      { kind: 'available', version: '0.4.0' },
      { kind: 'downloaded', version: '0.4.0' },
      { kind: 'available', version: '0.5.0' },
      { kind: 'failed', reason: 'late' },
      { kind: 'cancelled' },
    ];

    expect(folded(history)).toEqual(ready);
  });
});

propertyTest.prop([fc.array(anySignal, { maxLength: 32 })])(
  'any history containing a landed download ends ready',
  (signals) => {
    fc.pre(signals.some((signal) => signal.kind === 'downloaded'));

    expect(folded(signals).standing).toBe('ready');
  },
);
