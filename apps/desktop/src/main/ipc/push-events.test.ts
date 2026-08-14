import type { EngineStates, GatewayTraffic, LogBatch, Settings } from '@recompose/contracts';

import { defaultSettings } from '@recompose/contracts';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  pushAccountsChanged,
  pushCanvasCommand,
  pushDevtoolsToggle,
  pushEngineLogs,
  pushEngineStates,
  pushEngineTraffic,
  pushSettingsChanged,
  pushUsageCommand,
} from './push-events';

type Delivery = { channel: string; payload: unknown };

type OpenWindow = { webContents: { send: (channel: string, payload: unknown) => void } };

const desktop = vi.hoisted((): { open: OpenWindow[]; focused: OpenWindow | null } => ({
  open: [],
  focused: null,
}));

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: (): OpenWindow[] => desktop.open,
    getFocusedWindow: (): OpenWindow | null => desktop.focused,
  },
}));

function openWindow(): Delivery[] {
  const delivered: Delivery[] = [];

  desktop.open.push({
    webContents: {
      send: (channel, payload) => {
        delivered.push({ channel, payload });
      },
    },
  });

  return delivered;
}

function focusWindow(): Delivery[] {
  const delivered = openWindow();

  desktop.focused = desktop.open.at(-1) ?? null;

  return delivered;
}

beforeEach(() => {
  desktop.open = [];
  desktop.focused = null;
});

describe('telling the open windows what changed', () => {
  test('a new engine state reaches every open window', () => {
    const first = openWindow();
    const second = openWindow();
    const states: EngineStates = { 'my-gateway': { status: 'running' } };

    pushEngineStates(states);

    expect(first).toEqual([{ channel: 'engine:state', payload: states }]);
    expect(second).toEqual([{ channel: 'engine:state', payload: states }]);
  });

  test('a fresh traffic snapshot reaches every open window', () => {
    const first = openWindow();
    const second = openWindow();
    const traffic: GatewayTraffic = {
      'my-gateway': { fast: { only: { outcome: 'served', at: 1_754_600_000_000 } } },
    };

    pushEngineTraffic(traffic);

    expect(first).toEqual([{ channel: 'engine:traffic', payload: traffic }]);
    expect(second).toEqual([{ channel: 'engine:traffic', payload: traffic }]);
  });

  test('a changed account list reaches every open window', () => {
    const first = openWindow();
    const second = openWindow();

    pushAccountsChanged();

    expect(first).toEqual([{ channel: 'accounts:changed', payload: 'changed' }]);
    expect(second).toEqual([{ channel: 'accounts:changed', payload: 'changed' }]);
  });

  test('a saved settings document reaches every open window', () => {
    const first = openWindow();
    const second = openWindow();
    const settings: Settings = { ...defaultSettings(), theme: 'dark' };

    pushSettingsChanged(settings);

    expect(first).toEqual([{ channel: 'settings:changed', payload: settings }]);
    expect(second).toEqual([{ channel: 'settings:changed', payload: settings }]);
  });
});

describe('telling the open windows which requests were served', () => {
  test('a run of logged requests reaches every open window', () => {
    const first = openWindow();
    const second = openWindow();
    const batch: LogBatch = {
      kind: 'append',
      rows: [
        {
          id: 'log-1',
          at: 1_754_600_000_000,
          gateway: 'my-gateway',
          virtualModel: 'fast',
          origin: 'provider',
          method: 'POST',
          status: 200,
          clientKey: 'sha256:8706ee88bbbdda48d02a4888691822b90d8b136bc5fb8e3a815e518105f0655c',
        },
      ],
    };

    pushEngineLogs(batch);

    expect(first).toEqual([{ channel: 'engine:logs', payload: batch }]);
    expect(second).toEqual([{ channel: 'engine:logs', payload: batch }]);
  });
});

describe('asking the renderer for its devtools', () => {
  test('the ask reaches every open window', () => {
    const first = openWindow();
    const second = openWindow();

    pushDevtoolsToggle();

    expect(first).toEqual([{ channel: 'devtools:toggle', payload: 'asked' }]);
    expect(second).toEqual([{ channel: 'devtools:toggle', payload: 'asked' }]);
  });
});

describe('driving the canvas from the menu bar', () => {
  test('a canvas command reaches the window in front and no other', () => {
    const background = openWindow();
    const inFront = focusWindow();

    pushCanvasCommand('zoom-to-fit');

    expect(inFront).toEqual([{ channel: 'canvas:command', payload: 'zoom-to-fit' }]);
    expect(background).toEqual([]);
  });

  test('a canvas command with no window in front reaches the one window standing', () => {
    const only = openWindow();

    pushCanvasCommand('tidy');

    expect(only).toEqual([{ channel: 'canvas:command', payload: 'tidy' }]);
  });

  test('a canvas command with no window in front and two standing reaches nobody', () => {
    const first = openWindow();
    const second = openWindow();

    pushCanvasCommand('tidy');

    expect(first).toEqual([]);
    expect(second).toEqual([]);
  });
});

describe('driving the usage explorer from the menu bar', () => {
  test('a usage command reaches the window in front and no other', () => {
    const background = openWindow();
    const inFront = focusWindow();

    pushUsageCommand('range-7d');

    expect(inFront).toEqual([{ channel: 'usage:command', payload: 'range-7d' }]);
    expect(background).toEqual([]);
  });

  test('a usage command with no window in front reaches the one window standing', () => {
    const only = openWindow();

    pushUsageCommand('refresh');

    expect(only).toEqual([{ channel: 'usage:command', payload: 'refresh' }]);
  });
});
