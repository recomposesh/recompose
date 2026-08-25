import { describe, expect, test } from 'vitest';

import { ipcChannels } from './ipc';

describe('the channels that answer with nothing', () => {
  test('opening the config folder carries no value back', () => {
    expect(
      ipcChannels['system:open-config-folder'].response.parse({ ok: true, value: undefined }),
    ).toEqual({ ok: true, value: undefined });
  });

  test('asking for the log history again carries no rows back, because they arrive by push', () => {
    expect(ipcChannels['engine:replay-logs'].request.safeParse(undefined).success).toBe(true);
    expect(
      ipcChannels['engine:replay-logs'].response.parse({ ok: true, value: undefined }),
    ).toEqual({ ok: true, value: undefined });
  });

  test('telling main the drawer stands open carries the standing and nothing else', () => {
    expect(ipcChannels['system:logs-drawer'].request.parse({ open: true })).toEqual({ open: true });
    expect(ipcChannels['system:logs-drawer'].request.parse({ open: false })).toEqual({
      open: false,
    });
    expect(() => ipcChannels['system:logs-drawer'].request.parse({})).toThrow();
    expect(() => ipcChannels['system:logs-drawer'].request.parse({ open: 'yes' })).toThrow();
  });

  test('the surface report carries every standing in one strict snapshot', () => {
    const standing = { sidebar: true, inspector: false, modal: false, setup: false };

    expect(ipcChannels['system:surface-toggles'].request.parse(standing)).toEqual(standing);
    expect(() =>
      ipcChannels['system:surface-toggles'].request.parse({ sidebar: true, inspector: false }),
    ).toThrow();
    expect(() =>
      ipcChannels['system:surface-toggles'].request.parse({ ...standing, drawer: true }),
    ).toThrow();
  });
});
