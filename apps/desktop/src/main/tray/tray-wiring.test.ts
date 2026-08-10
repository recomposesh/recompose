import { describe, expect, test } from 'vitest';

import type { TrayMenuHandlers } from './tray-menu-template';

import { trayMenuWiring } from './tray-wiring';

type Wired = {
  handlers: TrayMenuHandlers;
  asked: string[];
};

function wireOver(): Wired {
  const asked: string[] = [];

  const handlers = trayMenuWiring({
    showWindow: () => {
      asked.push('window');
    },
    openSettings: () => {
      asked.push('settings');
    },
    openDevtools: () => {
      asked.push('devtools');
    },
    quit: () => {
      asked.push('quit');
    },
    lifecycle: {
      start: (slug) => {
        asked.push(`start ${slug}`);
      },
      stop: (slug) => {
        asked.push(`stop ${slug}`);
      },
      restart: (slug) => {
        asked.push(`restart ${slug}`);
      },
    },
  });

  return { handlers, asked };
}

describe('what the menu bar items reach', () => {
  test('each item reaches the seam it names', () => {
    const wired = wireOver();

    wired.handlers.onOpenWindow();
    wired.handlers.onOpenSettings();
    wired.handlers.onOpenDevtools();
    wired.handlers.onQuit();

    expect(wired.asked).toEqual(['window', 'settings', 'devtools', 'quit']);
  });

  test('each lifecycle item carries the gateway it stands under', () => {
    const wired = wireOver();

    wired.handlers.onStartGateway('personal');
    wired.handlers.onStopGateway('work');
    wired.handlers.onRestartGateway('personal');

    expect(wired.asked).toEqual(['start personal', 'stop work', 'restart personal']);
  });
});
