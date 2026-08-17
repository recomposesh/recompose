import { describe, expect, test } from 'vitest';

import { ipcChannels, ipcEvents, type IpcEvent } from './ipc';

const runningState = { status: 'running' };

describe('the lifecycle push', () => {
  const eventNames: IpcEvent[] = [
    'engine:state',
    'engine:traffic',
    'engine:logs',
    'accounts:changed',
    'canvas:command',
    'usage:command',
    'view:command',
    'settings:changed',
    'devtools:toggle',
    'subscriptions:launch-refused',
  ];

  test('exactly the state, traffic, logs, account-change, command, settings, devtools, and launch-refused pushes exist', () => {
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

  test('the devtools push carries the one word it exists for', () => {
    expect(ipcEvents['devtools:toggle'].payload.parse('asked')).toBe('asked');
    expect(() => ipcEvents['devtools:toggle'].payload.parse('open')).toThrow();
  });

  test('an account change carries no stale registry snapshot', () => {
    expect(ipcEvents['accounts:changed'].payload.parse('changed')).toBe('changed');
    expect(() => {
      ipcEvents['accounts:changed'].payload.parse({ accounts: [] });
    }).toThrow();
  });
});

describe('the view command push', () => {
  test('a view push carries one of the two surface toggles', () => {
    const toggles = ['toggle-sidebar', 'toggle-inspector'];

    expect(toggles.map((toggle) => ipcEvents['view:command'].payload.parse(toggle))).toEqual(
      toggles,
    );
  });

  test('a view push refuses a toggle no View item names', () => {
    expect(() => ipcEvents['view:command'].payload.parse('toggle-logs')).toThrow();
  });
});

describe('the canvas command push', () => {
  test('a canvas push carries one of the eight acts the Gateway menu offers', () => {
    const acts = [
      'zoom-in',
      'zoom-out',
      'zoom-to-100',
      'zoom-to-fit',
      'tidy',
      'toggle-logs',
      'copy-base-url',
      'remove-gateway',
    ];

    expect(acts.map((act) => ipcEvents['canvas:command'].payload.parse(act))).toEqual(acts);
  });

  test('a canvas push refuses an act no menu item names', () => {
    expect(() => ipcEvents['canvas:command'].payload.parse('zoom')).toThrow();
    expect(() => ipcEvents['canvas:command'].payload.parse('rename-gateway')).toThrow();
  });
});

describe('the traffic push', () => {
  const flowed = { personal: { fast: { only: { outcome: 'served', at: 1_754_600_000_000 } } } };

  test('it carries the whole snapshot, so a missed push heals on the next', () => {
    expect(ipcEvents['engine:traffic'].payload.parse(flowed)).toEqual(flowed);
  });

  test('it refuses a single outcome a subscriber would have to merge', () => {
    expect(() =>
      ipcEvents['engine:traffic'].payload.parse({
        slug: 'personal',
        virtualModel: 'fast',
        outcome: 'served',
      }),
    ).toThrow();
  });

  test('it rides beside the invoke surface, so no window asks for traffic', () => {
    expect(Object.keys(ipcChannels)).not.toContain('engine:traffic');
  });
});

describe('the logs push', () => {
  const appended = {
    kind: 'append',
    rows: [
      {
        id: 'log-1',
        at: 1_754_600_000_000,
        gateway: 'personal',
        virtualModel: 'fast',
        origin: 'provider',
        method: 'POST',
        provider: 'anthropic',
        accountId: 'work',
        providerModel: 'claude-sonnet-4-5',
        status: 200,
        durationMs: 912,
        tokens: 1_820,
        clientKey: 'sha256:8706ee88bbbdda48d02a4888691822b90d8b136bc5fb8e3a815e518105f0655c',
      },
    ],
  };

  test('it carries a run of rows, because a snapshot would replace what a person is reading', () => {
    expect(ipcEvents['engine:logs'].payload.parse(appended)).toEqual(appended);
  });

  test('it refuses a bare row a subscriber would have to wrap', () => {
    expect(() => ipcEvents['engine:logs'].payload.parse(appended.rows[0])).toThrow();
  });

  test('it rides beside the invoke surface, so no window asks for logs', () => {
    expect(Object.keys(ipcChannels)).not.toContain('engine:logs');
  });
});

describe('the settings push', () => {
  test('it carries the whole document, so a missed push heals on the next', () => {
    const document = {
      schemaVersion: 6,
      theme: 'dark',
      launchAtLogin: false,
      showInMenuBar: true,
      firstRequestServed: true,
      showOnboardingChecklist: false,
      usageRetentionDays: 30,
    };

    expect(ipcEvents['settings:changed'].payload.parse(document)).toEqual(document);
  });

  test('it refuses a delta a subscriber would have to merge', () => {
    expect(() => ipcEvents['settings:changed'].payload.parse({ theme: 'dark' })).toThrow();
  });
});

describe('the push saying the terminal never opened', () => {
  test('it names the plan whose sign-in it belongs to, and why nothing opened', () => {
    const refused = {
      provider: 'anthropic',
      note: 'no terminal emulator on this machine could run claude /login',
    };

    expect(ipcEvents['subscriptions:launch-refused'].payload.parse(refused)).toEqual(refused);
  });

  test('a push naming no plan is refused, because the screen could not place it', () => {
    expect(() =>
      ipcEvents['subscriptions:launch-refused'].payload.parse({ note: 'nothing opened' }),
    ).toThrow();
  });

  test('a push carrying no reason is refused, because a blank line says nothing', () => {
    expect(() =>
      ipcEvents['subscriptions:launch-refused'].payload.parse({ provider: 'anthropic', note: '' }),
    ).toThrow();
  });

  test('it rides beside the invoke surface rather than inside it', () => {
    expect(Object.keys(ipcChannels)).not.toContain('subscriptions:launch-refused');
  });
});
