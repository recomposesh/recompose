import { describe, expect, test } from 'vitest';

import { buildAppMenuTemplate } from './app-menu-template';
import {
  atGatewayDetail,
  atHome,
  atUsage,
  everyPlatform,
  idleHandlers,
  itemLabelled,
  recordingHandlers,
  shapeOf,
} from './app-menu-template.testkit';

function pressed(template: ReturnType<typeof buildAppMenuTemplate>, label: string): void {
  itemLabelled(template, label)?.click?.();
}

describe('the Help menu trails on every platform and route', () => {
  test('the menu bar ends with Window and then Help', () => {
    for (const platform of everyPlatform) {
      for (const view of [atHome, atGatewayDetail, atUsage]) {
        const shape = shapeOf(buildAppMenuTemplate(platform, idleHandlers, view));

        expect(shape.at(-2)).toBe('windowMenu');
        expect(shape.at(-1)).toBe(platform === 'darwin' ? 'help' : 'Help');
      }
    }
  });

  test('macOS carries the system help role with no accelerator on the top-level item', () => {
    const template = buildAppMenuTemplate('darwin', idleHandlers, atHome);
    const help = template.at(-1);

    expect(help?.role).toBe('help');
    expect(help?.accelerator).toBeUndefined();
  });
});

describe('the three help items', () => {
  test('Recompose Help, the config folder, and the issue report each reach their seam', () => {
    const taken: string[] = [];
    const template = buildAppMenuTemplate('darwin', recordingHandlers(taken), atHome);

    pressed(template, 'Recompose Help');
    pressed(template, 'Reveal in Finder');
    pressed(template, 'Report an Issue…');

    expect(taken).toEqual(['help-site', 'config-folder', 'report-issue']);
  });

  test('the folder item speaks the settings screen reveal words per platform', () => {
    const onWindows = buildAppMenuTemplate('win32', idleHandlers, atHome);
    const onLinux = buildAppMenuTemplate('linux', idleHandlers, atHome);

    expect(itemLabelled(onWindows, 'Show in Explorer')).toBeDefined();
    expect(itemLabelled(onLinux, 'Open folder')).toBeDefined();
  });

  test('off macOS the Help menu ends with the About item, which no other menu carries there', () => {
    for (const platform of ['win32', 'linux'] satisfies NodeJS.Platform[]) {
      const template = buildAppMenuTemplate(platform, idleHandlers, atHome);
      const help = template.at(-1);

      expect(shapeOf(help?.submenu ?? []).at(-1)).toBe('about');
      expect(
        template
          .slice(0, -1)
          .flatMap((menu) => menu.submenu ?? [])
          .some((item) => item.role === 'about'),
      ).toBe(false);
    }
  });

  test('on macOS the About item stays in the application menu, so Help carries none', () => {
    const template = buildAppMenuTemplate('darwin', idleHandlers, atHome);
    const help = template.at(-1);

    expect(shapeOf(help?.submenu ?? [])).toEqual([
      'Recompose Help',
      'Reveal in Finder',
      'Report an Issue…',
    ]);
  });
});
