import { BrowserWindow } from 'electron';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { AppMenuConduct } from '../menu/app-menu-conductor';

import { wireWindowIntoMenu } from './window-menu-wiring';

type Listener = (event: unknown, url: string) => void;

const desktop = vi.hoisted(
  (): {
    open: unknown[];
    watched: unknown[];
    navigations: Map<string, Listener>;
    closings: (() => void)[];
  } => ({ open: [], watched: [], navigations: new Map(), closings: [] }),
);

vi.mock('@electron-toolkit/utils', () => ({
  optimizer: {
    watchWindowShortcuts: (window: unknown) => {
      desktop.watched.push(window);
    },
  },
}));

vi.mock('electron', () => ({
  BrowserWindow: class {
    static getAllWindows(): unknown[] {
      return desktop.open;
    }

    webContents = {
      on: (event: string, listener: Listener): void => {
        desktop.navigations.set(event, listener);
      },
    };

    on(_event: string, listener: () => void): void {
      desktop.closings.push(listener);
    }
  },
}));

function conductRecording(stood: string[]): AppMenuConduct {
  return {
    repaint: () => undefined,
    reflectSettings: () => undefined,
    standOnUrl: (url) => {
      stood.push(url);
    },
    standNowhere: () => {
      stood.push('nowhere');
    },
    reflectLogsDrawer: () => undefined,
    reflectUsageTable: () => undefined,
    reflectSurfaceToggles: () => undefined,
    reflectEngineStates: () => undefined,
  };
}

function everyClosing(): void {
  for (const closing of desktop.closings) {
    closing();
  }
}

beforeEach(() => {
  desktop.open = [];
  desktop.watched = [];
  desktop.navigations = new Map();
  desktop.closings = [];
});

describe('wiring a created window into the menu', () => {
  test('both navigation events feed the same stand, so the first load counts too', () => {
    const stood: string[] = [];

    wireWindowIntoMenu(new BrowserWindow(), conductRecording(stood), 'packaged');

    desktop.navigations.get('did-navigate')?.(undefined, 'app://renderer/index.html#/');
    desktop.navigations.get('did-navigate-in-page')?.(
      undefined,
      'app://renderer/index.html#/usage',
    );

    expect(stood).toEqual(['app://renderer/index.html#/', 'app://renderer/index.html#/usage']);
  });

  test('the last window closing stands the menu nowhere, an earlier one does not', () => {
    const stood: string[] = [];

    wireWindowIntoMenu(new BrowserWindow(), conductRecording(stood), 'packaged');

    desktop.open = [new BrowserWindow()];
    everyClosing();

    expect(stood).toEqual([]);

    desktop.open = [];
    everyClosing();

    expect(stood).toEqual(['nowhere']);
  });

  test('a development run wires the toolkit guard and a packaged run wires none', () => {
    wireWindowIntoMenu(new BrowserWindow(), conductRecording([]), 'development');

    expect(desktop.watched).toHaveLength(1);

    wireWindowIntoMenu(new BrowserWindow(), conductRecording([]), 'packaged');

    expect(desktop.watched).toHaveLength(1);
  });
});
