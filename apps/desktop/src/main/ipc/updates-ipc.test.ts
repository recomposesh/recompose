import type { UpdateState } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { createUpdatesIpcHandlers } from './updates-ipc';

const ready: UpdateState = { standing: 'ready', version: '0.4.0' };
const quiet: UpdateState = { standing: 'quiet' };

function wiredHolding(state: UpdateState) {
  return { state: () => state, restart: () => state.standing === 'ready' };
}

describe('asking where the update stands', () => {
  test('the answer is the held state', async () => {
    const handlers = createUpdatesIpcHandlers(wiredHolding(ready));

    await expect(handlers['updates:get']()).resolves.toEqual({ ok: true, value: ready });
  });

  test('a quiet channel answers quiet', async () => {
    const handlers = createUpdatesIpcHandlers(wiredHolding(quiet));

    await expect(handlers['updates:get']()).resolves.toEqual({ ok: true, value: quiet });
  });
});

describe('asking for the restart', () => {
  test('a waiting update restarts', async () => {
    const handlers = createUpdatesIpcHandlers(wiredHolding(ready));

    await expect(handlers['updates:restart']()).resolves.toEqual({ ok: true, value: undefined });
  });

  test('nothing waiting refuses instead of restarting', async () => {
    const handlers = createUpdatesIpcHandlers(wiredHolding(quiet));

    await expect(handlers['updates:restart']()).resolves.toEqual({
      ok: false,
      error: { code: 'no-update-waiting', message: 'no downloaded update stands ready to install' },
    });
  });
});
