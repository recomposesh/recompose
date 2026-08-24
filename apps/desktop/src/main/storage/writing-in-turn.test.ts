import { describe, expect, test } from 'vitest';

import { writingInTurn } from './writing-in-turn';

function heldUntilReleased() {
  let release = (): void => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });

  return {
    held,
    release: () => {
      release();
    },
  };
}

describe('a document that takes one write at a time', () => {
  test('the second write waits for the first to land', async () => {
    const landed: string[] = [];
    const gates = [heldUntilReleased(), heldUntilReleased()];
    const named = ['first', 'second'];
    let started = 0;
    const flush = writingInTurn(async () => {
      const turn = started;

      started += 1;
      await gates[turn]?.held;
      landed.push(named[turn] ?? '');
    });

    const one = flush();
    const two = flush();

    gates[1]?.release();
    await Promise.resolve();

    expect(landed).toEqual([]);

    gates[0]?.release();
    await Promise.all([one, two]);

    expect(landed).toEqual(['first', 'second']);
  });

  test('a write that refuses lets the next one run', async () => {
    const landed: string[] = [];
    let started = 0;
    const flush = writingInTurn(async () => {
      await Promise.resolve();
      started += 1;

      if (started === 1) {
        throw new Error('the disk refused');
      }

      landed.push('second');
    });

    await expect(flush()).rejects.toThrow('the disk refused');
    await flush();

    expect(landed).toEqual(['second']);
  });

  test('a refusal reaches the caller that asked for that write', async () => {
    const flush = writingInTurn(async () => {
      await Promise.resolve();

      throw new Error('the disk refused');
    });

    await expect(flush()).rejects.toThrow('the disk refused');
  });
});
