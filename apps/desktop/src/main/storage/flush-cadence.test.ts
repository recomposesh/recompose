import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { flushingWhenQuiet } from './flush-cadence';

function writesCounted(): { writes: () => number; cadence: ReturnType<typeof flushingWhenQuiet> } {
  let written = 0;
  const cadence = flushingWhenQuiet(() => {
    written += 1;
  });

  return { writes: () => written, cadence };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('when a changed document reaches the disk', () => {
  test('a quiet three seconds after the last change writes once', () => {
    const { writes, cadence } = writesCounted();

    cadence.watchForQuiet();
    vi.advanceTimersByTime(2_000);
    cadence.watchForQuiet();
    vi.advanceTimersByTime(2_000);

    expect(writes()).toBe(0);

    vi.advanceTimersByTime(1_000);

    expect(writes()).toBe(1);
  });

  test('a change that never settles still writes by the thirty second ceiling', () => {
    const { writes, cadence } = writesCounted();

    for (let beat = 0; beat < 20; beat += 1) {
      cadence.watchForQuiet();
      vi.advanceTimersByTime(2_000);
    }

    expect(writes()).toBe(1);
  });

  test('a store that stops watching leaves no write behind it', () => {
    const { writes, cadence } = writesCounted();

    cadence.watchForQuiet();
    cadence.stopWatching();
    vi.advanceTimersByTime(60_000);

    expect(writes()).toBe(0);
  });
});
