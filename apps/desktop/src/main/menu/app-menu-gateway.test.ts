import { describe, expect, test } from 'vitest';

import { buildAppMenuTemplate } from './app-menu-template';
import {
  atGatewayDetail,
  atHome,
  everyPlatform,
  idleHandlers,
  itemLabelled,
  menuLabelled,
  recordingHandlers,
} from './app-menu-template.testkit';

describe('driving the canvas from the menu bar', () => {
  test('a gateway surface gathers the canvas acts under Gateway, on the shortcuts zoom means here', () => {
    for (const platform of everyPlatform) {
      const gatewayMenu = menuLabelled(
        buildAppMenuTemplate(platform, idleHandlers, atGatewayDetail),
        'Gateway',
      );

      expect(
        (gatewayMenu?.submenu ?? []).map((item) => [item.label ?? item.type, item.accelerator]),
      ).toEqual([
        ['Zoom In', 'CmdOrCtrl+='],
        ['Zoom Out', 'CmdOrCtrl+-'],
        ['Zoom to Fit', 'CmdOrCtrl+0'],
        ['separator', undefined],
        ['Tidy', undefined],
        ['separator', undefined],
        ['Show Logs', 'CmdOrCtrl+Shift+L'],
      ]);
    }
  });

  test('a surface holding no gateway carries no Gateway menu', () => {
    for (const platform of everyPlatform) {
      const template = buildAppMenuTemplate(platform, idleHandlers, atHome);

      expect(menuLabelled(template, 'Gateway')).toBeUndefined();
      expect(menuLabelled(template, 'Canvas')).toBeUndefined();
    }
  });

  test('choosing an act carries its command to the canvas', () => {
    const taken: string[] = [];
    const template = buildAppMenuTemplate('darwin', recordingHandlers(taken), atGatewayDetail);

    for (const label of ['Zoom In', 'Zoom Out', 'Zoom to Fit', 'Tidy', 'Show Logs']) {
      itemLabelled(template, label)?.click?.();
    }

    expect(taken).toEqual(['zoom-in', 'zoom-out', 'zoom-to-fit', 'tidy', 'toggle-logs']);
  });
});

describe('the logs drawer toggle', () => {
  test('only a gateway surface offers it, because only that surface has a drawer', () => {
    for (const platform of everyPlatform) {
      expect(itemLabelled(buildAppMenuTemplate(platform, idleHandlers, atHome), 'Show Logs')).toBe(
        undefined,
      );
    }
  });

  test('the tick reads whether the drawer stands open', () => {
    for (const open of [true, false]) {
      const item = itemLabelled(
        buildAppMenuTemplate('darwin', idleHandlers, { ...atGatewayDetail, logsDrawerOpen: open }),
        'Show Logs',
      );

      expect(item?.type).toBe('checkbox');
      expect(item?.checked).toBe(open);
    }
  });

  test('choosing it carries the same command whether the drawer stands open or closed', () => {
    const fromOpen: string[] = [];
    const fromClosed: string[] = [];

    itemLabelled(
      buildAppMenuTemplate('darwin', recordingHandlers(fromOpen), {
        ...atGatewayDetail,
        logsDrawerOpen: true,
      }),
      'Show Logs',
    )?.click?.();
    itemLabelled(
      buildAppMenuTemplate('darwin', recordingHandlers(fromClosed), atGatewayDetail),
      'Show Logs',
    )?.click?.();

    expect(fromOpen).toEqual(['toggle-logs']);
    expect(fromClosed).toEqual(['toggle-logs']);
  });
});
