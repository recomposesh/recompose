import { describe, expect, test } from 'vitest';

import type { AnsweringReading, AnsweringWatch } from './stopped-answering';

import { NOTHING_WATCHED, putAway, watchedAnswering } from './stopped-answering';

function after(...readings: readonly AnsweringReading[]): AnsweringWatch {
  return readings.reduce(watchedAnswering, NOTHING_WATCHED);
}

const serving: AnsweringReading = { serving: true, asking: false };

const down: AnsweringReading = { serving: false, asking: false };

const asking: AnsweringReading = { serving: false, asking: true };

const askingWhileServing: AnsweringReading = { serving: true, asking: true };

describe('a gateway nobody has watched go down', () => {
  test('a serving gateway raises nothing, because there is nothing to explain', () => {
    expect(after(serving).stoppedAnswering).toBe(false);
  });

  test('a gateway that never served in this window raises nothing at all', () => {
    expect(after(down, down, down).stoppedAnswering).toBe(false);
  });

  test('a start that never came up on a gateway that never served raises nothing', () => {
    expect(after(down, asking, down).stoppedAnswering).toBe(false);
  });
});

describe('a gateway that went down with nothing here asking', () => {
  test('it reads as having stopped answering, which is the fact a person can act on', () => {
    expect(after(serving, down).stoppedAnswering).toBe(true);
  });

  test('it keeps reading that way while it stays down, so the notice does not flicker', () => {
    expect(after(serving, down, down, down).stoppedAnswering).toBe(true);
  });

  test('serving again clears it, so no notice outlives what it explains', () => {
    expect(after(serving, down, asking, serving).stoppedAnswering).toBe(false);
  });

  test('going down a second time raises it again, once it had served in between', () => {
    expect(after(serving, down, serving, down).stoppedAnswering).toBe(true);
  });
});

describe('a gateway a person stopped themselves', () => {
  test('it reads as simply stopped, because the person who asked already knows why', () => {
    expect(after(serving, askingWhileServing, down).stoppedAnswering).toBe(false);
  });

  test('an act still in flight as it goes down counts as the asking too', () => {
    expect(after(serving, asking).stoppedAnswering).toBe(false);
  });

  test('editing the composition long after that stop still raises nothing', () => {
    expect(after(serving, askingWhileServing, down, down, down).stoppedAnswering).toBe(false);
  });

  test('starting it again and losing it raises the notice, because that stop was not asked for', () => {
    expect(after(serving, askingWhileServing, down, asking, serving, down).stoppedAnswering).toBe(
      true,
    );
  });
});

describe('putting the notice away', () => {
  test('a person who has read it can put it away and be left alone', () => {
    expect(putAway(after(serving, down)).stoppedAnswering).toBe(false);
  });

  test('it stays away while the gateway stays down, rather than returning on the next reading', () => {
    const held = putAway(after(serving, down));

    expect(watchedAnswering(held, down).stoppedAnswering).toBe(false);
  });

  test('it returns once the gateway serves again and goes down again unasked', () => {
    const held = putAway(after(serving, down));

    expect(after().stoppedAnswering).toBe(false);
    expect([serving, down].reduce(watchedAnswering, held).stoppedAnswering).toBe(true);
  });
});
