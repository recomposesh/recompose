import type { EngineStates, GatewayTraffic } from '@recompose/contracts';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  pushAccountsChanged,
  pushCanvasCommand,
  pushEngineStates,
  pushEngineTraffic,
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
      'my-gateway': { fast: { outcome: 'served', at: 1_754_600_000_000 } },
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
});

describe('driving the canvas from the menu bar', () => {
  test('a canvas command reaches the window in front and no other', () => {
    const background = openWindow();
    const inFront = focusWindow();

    pushCanvasCommand('zoom-to-fit');

    expect(inFront).toEqual([{ channel: 'canvas:command', payload: 'zoom-to-fit' }]);
    expect(background).toEqual([]);
  });

  test('a canvas command with no window in front reaches nobody', () => {
    const background = openWindow();

    pushCanvasCommand('tidy');

    expect(background).toEqual([]);
  });
});
