import { BrowserWindow } from 'electron';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { guardWindowShortcuts } from './window-shortcut-guard';

const desktop = vi.hoisted(
  (): { watched: { window: unknown; options: unknown }[]; registered: string[] } => ({
    watched: [],
    registered: [],
  }),
);

vi.mock('@electron-toolkit/utils', () => ({
  optimizer: {
    watchWindowShortcuts: (window: unknown, options: unknown) => {
      desktop.watched.push({ window, options });
    },
  },
}));

vi.mock('electron', () => ({
  BrowserWindow: class {
    webContents = {
      on: (event: string) => {
        desktop.registered.push(event);
      },
    };
  },
}));

beforeEach(() => {
  desktop.watched = [];
  desktop.registered = [];
});

describe('the window shortcut guard', () => {
  test('a packaged run attaches no input listener at all, so the printed keystrokes live', () => {
    guardWindowShortcuts(new BrowserWindow(), 'packaged');

    expect(desktop.watched).toEqual([]);
    expect(desktop.registered).toEqual([]);
  });

  test('a development run delegates to the toolkit with the zoom chords exempt', () => {
    const window = new BrowserWindow();

    guardWindowShortcuts(window, 'development');

    expect(desktop.watched).toEqual([{ window, options: { zoom: true } }]);
  });
});
