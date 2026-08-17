import { describe, expect, test } from 'vitest';

import { buildAppMenuTemplate } from './app-menu-template';
import {
  atHome,
  atUsage,
  everyPlatform,
  idleHandlers,
  itemEnabled,
  itemLabelled,
  menuLabelled,
  recordingHandlers,
} from './app-menu-template.testkit';

function pressed(template: ReturnType<typeof buildAppMenuTemplate>, label: string): void {
  itemLabelled(template, label)?.click?.();
}

describe('the Usage menu names every range the address accepts', () => {
  test('the ranges stand in address order on the Option-modified digits, custom bare', () => {
    for (const platform of everyPlatform) {
      const usageMenu = menuLabelled(
        buildAppMenuTemplate(platform, idleHandlers, atUsage),
        'Usage',
      );
      const rows = (usageMenu?.submenu ?? []).slice(0, 7);

      expect(rows.map((item) => [item.label, item.accelerator])).toEqual([
        ['Last Hour', 'Alt+CmdOrCtrl+1'],
        ['Last 24 Hours', 'Alt+CmdOrCtrl+2'],
        ['Last 7 Days', 'Alt+CmdOrCtrl+3'],
        ['Last 30 Days', 'Alt+CmdOrCtrl+4'],
        ['This Week', 'Alt+CmdOrCtrl+5'],
        ['This Month', 'Alt+CmdOrCtrl+6'],
        ['Custom Range…', undefined],
      ]);
    }
  });

  test('a surface away from usage carries no Usage menu', () => {
    for (const platform of everyPlatform) {
      expect(menuLabelled(buildAppMenuTemplate(platform, idleHandlers, atHome), 'Usage')).toBe(
        undefined,
      );
    }
  });
});

describe('a range pick from the menu', () => {
  test('every range pick carries its derived command, custom included', () => {
    const taken: string[] = [];
    const template = buildAppMenuTemplate('darwin', recordingHandlers(taken), atUsage);

    for (const label of [
      'Last Hour',
      'Last 24 Hours',
      'Last 7 Days',
      'Last 30 Days',
      'This Week',
      'This Month',
      'Custom Range…',
    ]) {
      pressed(template, label);
    }

    expect(taken).toEqual([
      'range-1h',
      'range-24h',
      'range-7d',
      'range-30d',
      'range-this-week',
      'range-this-month',
      'range-custom',
    ]);
  });

  test('the range rows tick the standing pick as one radio group', () => {
    const template = buildAppMenuTemplate('darwin', idleHandlers, {
      ...atUsage,
      usageRange: 'this-week',
    });

    expect(itemLabelled(template, 'This Week')?.type).toBe('radio');
    expect(itemLabelled(template, 'This Week')?.checked).toBe(true);
    expect(itemLabelled(template, 'Last 24 Hours')?.checked).toBe(false);
  });

  test('a preset wider than the retention window dims, mirroring the on-screen control', () => {
    const template = buildAppMenuTemplate('darwin', idleHandlers, {
      ...atUsage,
      usageRetentionDays: 7,
    });

    expect(itemEnabled(template, 'Last 30 Days')).toBe(false);
    expect(itemEnabled(template, 'Last 7 Days')).toBe(true);
  });
});

describe('the metric submenu and the table twin', () => {
  test('the metric rows tick the standing pick as one radio group', () => {
    const template = buildAppMenuTemplate('darwin', idleHandlers, {
      ...atUsage,
      usageMetric: 'spend',
    });

    expect(itemLabelled(template, 'Spend')?.type).toBe('radio');
    expect(itemLabelled(template, 'Spend')?.checked).toBe(true);
    expect(itemLabelled(template, 'Requests')?.checked).toBe(false);
  });

  test('the metric submenu carries every series the chart draws and nothing else', () => {
    const taken: string[] = [];
    const template = buildAppMenuTemplate('darwin', recordingHandlers(taken), atUsage);

    for (const label of ['Requests', 'Latency', 'Tokens', 'Spend']) {
      pressed(template, label);
    }

    expect(taken).toEqual(['metric-requests', 'metric-latency', 'metric-tokens', 'metric-spend']);
    expect(itemLabelled(template, 'Errors')).toBeUndefined();
  });

  test('the data table tick reads whether the twin stands open', () => {
    for (const open of [true, false]) {
      const item = itemLabelled(
        buildAppMenuTemplate('darwin', idleHandlers, { ...atUsage, usageTableOpen: open }),
        'Show Data Table',
      );

      expect(item?.type).toBe('checkbox');
      expect(item?.checked).toBe(open);
    }
  });
});

describe('the refresh row', () => {
  test('Refresh Usage leaves the force-reload chord for the Option-modified R', () => {
    const template = buildAppMenuTemplate('darwin', idleHandlers, atUsage);
    const refresh = itemLabelled(template, 'Refresh Usage');

    expect(refresh?.accelerator).toBe('Alt+CmdOrCtrl+R');
  });

  test('choosing it asks the page for a fresh read', () => {
    const taken: string[] = [];

    pressed(buildAppMenuTemplate('darwin', recordingHandlers(taken), atUsage), 'Refresh Usage');

    expect(taken).toEqual(['refresh']);
  });
});
