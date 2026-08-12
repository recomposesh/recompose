import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { useDisplayTick } from './use-display-tick';

const A_SECOND = 1_000;

const MOUNT_INSTANT = 1_760_000_000_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MOUNT_INSTANT);
});

afterEach(() => {
  vi.useRealTimers();
});

test('a fresh surface reads the instant it mounted at', async () => {
  const { result } = await renderHook(() => useDisplayTick(A_SECOND));

  expect(result.current).toBe(MOUNT_INSTANT);
});

test('the reading moves along once the caller beat elapses', async () => {
  const { result, act } = await renderHook(() => useDisplayTick(A_SECOND));

  await act(async () => {
    await vi.advanceTimersByTimeAsync(A_SECOND);
  });

  expect(result.current).toBe(MOUNT_INSTANT + A_SECOND);
});

test('the reading holds still between beats rather than chasing every frame', async () => {
  const { result, act } = await renderHook(() => useDisplayTick(A_SECOND));

  await act(async () => {
    await vi.advanceTimersByTimeAsync(A_SECOND - 1);
  });

  expect(result.current).toBe(MOUNT_INSTANT);
});
