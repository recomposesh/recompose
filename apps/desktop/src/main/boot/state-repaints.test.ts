import type { EngineStates } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { fannedStateRepaints, surfaceStateRepaints } from './state-repaints';

describe('one states push fanned to every repainting surface', () => {
  test('every surface hears the same snapshot, in the order it stands', () => {
    const heard: string[] = [];
    const snapshot: EngineStates = { relay: { status: 'running' } };
    const fanned = fannedStateRepaints([
      (states) => {
        heard.push(`tray ${Object.keys(states).join(',')}`);
      },
      (states) => {
        heard.push(`menu ${Object.keys(states).join(',')}`);
      },
    ]);

    fanned(snapshot);

    expect(heard).toEqual(['tray relay', 'menu relay']);
  });

  test('a surface this run never installed is skipped without erroring', () => {
    const heard: string[] = [];
    const fanned = fannedStateRepaints([
      null,
      () => {
        heard.push('menu');
      },
    ]);

    fanned({});

    expect(heard).toEqual(['menu']);
  });
});

describe('the surfaces an engine push repaints', () => {
  test('the tray, the Dock, and the menu conductor all hear an engine push', () => {
    const heard: string[] = [];
    const repaints = surfaceStateRepaints({
      repaintTray: () => {
        heard.push('tray');
      },
      repaintDock: () => {
        heard.push('dock');
      },
      reflectMenu: () => {
        heard.push('menu');
      },
    });

    repaints({ relay: { status: 'running' } });

    expect(heard).toEqual(['tray', 'dock', 'menu']);
  });

  test('an accessory run with no Dock still reaches the tray and the menu', () => {
    const heard: string[] = [];
    const repaints = surfaceStateRepaints({
      repaintTray: () => {
        heard.push('tray');
      },
      repaintDock: null,
      reflectMenu: () => {
        heard.push('menu');
      },
    });

    repaints({});

    expect(heard).toEqual(['tray', 'menu']);
  });
});
