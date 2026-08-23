import { describe, expect, test } from 'vitest';

import { buildAppMenuTemplate } from './app-menu-template';
import {
  atGatewayDetail,
  atHome,
  everyPlatform,
  idleHandlers,
  itemEnabled,
  itemLabelled,
  menuLabelled,
  recordingHandlers,
} from './app-menu-template.testkit';

const serving = { ...atGatewayDetail, gatewayServing: true };

function pressed(template: ReturnType<typeof buildAppMenuTemplate>, label: string): void {
  itemLabelled(template, label)?.click?.();
}

describe('the Gateway menu shape', () => {
  test('lifecycle leads, then the copy, the zoom group, Tidy Up, the logs, and the delete last', () => {
    for (const platform of everyPlatform) {
      const gatewayMenu = menuLabelled(
        buildAppMenuTemplate(platform, idleHandlers, atGatewayDetail),
        'Gateway',
      );

      expect(
        (gatewayMenu?.submenu ?? []).map((item) => [item.label ?? item.type, item.accelerator]),
      ).toEqual([
        ['Start Gateway', 'CmdOrCtrl+Return'],
        ['Stop Gateway', 'CmdOrCtrl+.'],
        ['Restart Gateway', 'Shift+CmdOrCtrl+Return'],
        ['separator', undefined],
        ['Copy Base URL', undefined],
        ['separator', undefined],
        ['Zoom In', 'CmdOrCtrl+='],
        ['Zoom Out', 'CmdOrCtrl+-'],
        ['Actual Size', 'CmdOrCtrl+0'],
        ['Zoom to Fit', 'Shift+CmdOrCtrl+0'],
        ['separator', undefined],
        ['Tidy Up', 'Alt+CmdOrCtrl+T'],
        ['separator', undefined],
        ['Show Logs', 'Control+`'],
        ['separator', undefined],
        ['Delete Gateway', undefined],
      ]);
    }
  });

  test('a surface holding no gateway carries no Gateway menu', () => {
    for (const platform of everyPlatform) {
      expect(menuLabelled(buildAppMenuTemplate(platform, idleHandlers, atHome), 'Gateway')).toBe(
        undefined,
      );
    }
  });
});

describe('the lifecycle group drives the standing gateway', () => {
  test('a still gateway offers Start alone, under the tray enablement rule', () => {
    const template = buildAppMenuTemplate('darwin', idleHandlers, atGatewayDetail);

    expect(itemEnabled(template, 'Start Gateway')).toBe(true);
    expect(itemEnabled(template, 'Stop Gateway')).toBe(false);
    expect(itemEnabled(template, 'Restart Gateway')).toBe(false);
  });

  test('a serving gateway offers Stop and Restart, never Start', () => {
    const template = buildAppMenuTemplate('darwin', idleHandlers, serving);

    expect(itemEnabled(template, 'Start Gateway')).toBe(false);
    expect(itemEnabled(template, 'Stop Gateway')).toBe(true);
    expect(itemEnabled(template, 'Restart Gateway')).toBe(true);
  });

  test('every lifecycle pick hands the standing slug to its own seam', () => {
    const taken: string[] = [];
    const template = buildAppMenuTemplate('darwin', recordingHandlers(taken), serving);

    pressed(template, 'Start Gateway');
    pressed(template, 'Stop Gateway');
    pressed(template, 'Restart Gateway');

    expect(taken).toEqual(['start personal', 'stop personal', 'restart personal']);
  });
});

describe('the canvas acts on the Gateway menu', () => {
  test('the zoom split lands 100% on the plain reset chord and fitting on the shifted one', () => {
    const taken: string[] = [];
    const template = buildAppMenuTemplate('darwin', recordingHandlers(taken), atGatewayDetail);

    for (const label of ['Zoom In', 'Zoom Out', 'Actual Size', 'Zoom to Fit', 'Tidy Up']) {
      pressed(template, label);
    }

    expect(taken).toEqual(['zoom-in', 'zoom-out', 'zoom-to-100', 'zoom-to-fit', 'tidy']);
  });

  test('Copy Base URL and Delete Gateway ride the same channel into the page', () => {
    const taken: string[] = [];
    const template = buildAppMenuTemplate('darwin', recordingHandlers(taken), atGatewayDetail);

    pressed(template, 'Copy Base URL');
    pressed(template, 'Delete Gateway');

    expect(taken).toEqual(['copy-base-url', 'remove-gateway']);
  });

  test('Copy Base URL stays available while the detail stands, serving or not', () => {
    expect(
      itemEnabled(buildAppMenuTemplate('darwin', idleHandlers, serving), 'Copy Base URL'),
    ).toBe(true);
    expect(
      itemEnabled(buildAppMenuTemplate('darwin', idleHandlers, atGatewayDetail), 'Copy Base URL'),
    ).toBe(true);
  });
});

describe('the logs drawer toggle', () => {
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
    const taken: string[] = [];

    pressed(buildAppMenuTemplate('darwin', recordingHandlers(taken), atGatewayDetail), 'Show Logs');

    expect(taken).toEqual(['toggle-logs']);
  });
});

describe('a question standing over the window', () => {
  test('the route-scoped menus and New Gateway dim, so an armed accelerator never acts behind it', () => {
    const template = buildAppMenuTemplate('darwin', idleHandlers, {
      ...atGatewayDetail,
      modalStanding: true,
    });

    expect(menuLabelled(template, 'Gateway')?.enabled).toBe(false);
    expect(itemEnabled(template, 'New Gateway…')).toBe(false);
  });

  test('with no question standing everything answers again', () => {
    const template = buildAppMenuTemplate('darwin', idleHandlers, atGatewayDetail);

    expect(menuLabelled(template, 'Gateway')?.enabled ?? true).toBe(true);
    expect(itemEnabled(template, 'New Gateway…')).toBe(true);
  });
});
