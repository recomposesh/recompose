import { describe, expect, test } from 'vitest';

import { buildAppMenuTemplate } from './app-menu-template';
import {
  atHome,
  atUsage,
  everyPlatform,
  idleHandlers,
  itemLabelled,
  menuLabelled,
  recordingHandlers,
} from './app-menu-template.testkit';

describe('driving the usage explorer from the menu bar', () => {
  test('the usage surface gathers ranges, metrics, the table twin, and Refresh under Usage', () => {
    for (const platform of everyPlatform) {
      const usageMenu = menuLabelled(
        buildAppMenuTemplate(platform, idleHandlers, atUsage),
        'Usage',
      );

      expect(
        (usageMenu?.submenu ?? []).map((item) => [item.label ?? item.type, item.accelerator]),
      ).toEqual([
        ['Last 24 Hours', 'CmdOrCtrl+1'],
        ['Last 7 Days', 'CmdOrCtrl+2'],
        ['Last 30 Days', 'CmdOrCtrl+3'],
        ['separator', undefined],
        ['Metric', undefined],
        ['separator', undefined],
        ['Show Data Table', 'CmdOrCtrl+Shift+T'],
        ['separator', undefined],
        ['Refresh Usage', 'CmdOrCtrl+Shift+R'],
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

  test('choosing a range or an act carries its command to the page', () => {
    const taken: string[] = [];
    const template = buildAppMenuTemplate('darwin', recordingHandlers(taken), atUsage);

    for (const label of [
      'Last 24 Hours',
      'Last 7 Days',
      'Last 30 Days',
      'Show Data Table',
      'Refresh Usage',
    ]) {
      itemLabelled(template, label)?.click?.();
    }

    expect(taken).toEqual(['range-24h', 'range-7d', 'range-30d', 'toggle-table-twin', 'refresh']);
  });
});

describe('the metric submenu and the table twin tick', () => {
  test('the metric submenu carries every series the chart can draw', () => {
    const taken: string[] = [];
    const template = buildAppMenuTemplate('darwin', recordingHandlers(taken), atUsage);

    for (const label of ['Requests', 'Latency', 'Tokens', 'Spend']) {
      itemLabelled(template, label)?.click?.();
    }

    expect(taken).toEqual(['metric-requests', 'metric-latency', 'metric-tokens', 'metric-spend']);
  });

  test('the metric submenu offers no series the chart cannot draw', () => {
    const template = buildAppMenuTemplate('darwin', idleHandlers, atUsage);

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
