import { describe, expect, test } from 'vitest';

import { ipcChannels, ipcEvents, type IpcEvent } from './ipc';

const runningState = { status: 'running' };

describe('the lifecycle push', () => {
  const eventNames: IpcEvent[] = [
    'engine:state',
    'accounts:changed',
    'canvas:command',
    'settings:changed',
  ];

  test('exactly the state, account-change, canvas, and settings pushes exist', () => {
    expect(Object.keys(ipcEvents)).toEqual(eventNames);
  });

  test('the push carries the whole snapshot, so a missed push heals on the next', () => {
    const snapshot = { personal: runningState, work: { status: 'stopped' } };

    expect(ipcEvents['engine:state'].payload.parse(snapshot)).toEqual(snapshot);
  });

  test('the push carries no delta a subscriber would have to order', () => {
    expect(() =>
      ipcEvents['engine:state'].payload.parse({ slug: 'personal', state: runningState }),
    ).toThrow();
  });

  test('a snapshot keyed by something no gateway could be named is refused', () => {
    expect(() => ipcEvents['engine:state'].payload.parse({ UPPER: runningState })).toThrow();
  });

  test('the push rides beside the invoke surface rather than inside it', () => {
    expect(Object.keys(ipcChannels)).not.toContain('engine:state');
  });

  test('a canvas push carries one of the four acts the Canvas menu offers', () => {
    const acts = ['zoom-in', 'zoom-out', 'zoom-to-fit', 'tidy'];

    expect(acts.map((act) => ipcEvents['canvas:command'].payload.parse(act))).toEqual(acts);
  });

  test('a canvas push refuses an act no menu item names', () => {
    expect(() => ipcEvents['canvas:command'].payload.parse('zoom')).toThrow();
  });

  test('an account change carries no stale registry snapshot', () => {
    expect(ipcEvents['accounts:changed'].payload.parse('changed')).toBe('changed');
    expect(() => {
      ipcEvents['accounts:changed'].payload.parse({ accounts: [] });
    }).toThrow();
  });
});

describe('the settings push', () => {
  test('it carries the whole document, so a missed push heals on the next', () => {
    const document = {
      schemaVersion: 5,
      theme: 'dark',
      launchAtLogin: false,
      showInMenuBar: true,
      firstRequestServed: true,
      showOnboardingChecklist: false,
    };

    expect(ipcEvents['settings:changed'].payload.parse(document)).toEqual(document);
  });

  test('it refuses a delta a subscriber would have to merge', () => {
    expect(() => ipcEvents['settings:changed'].payload.parse({ theme: 'dark' })).toThrow();
  });
});
