import { describe, expect, test } from 'vitest';

import { buildAppMenuTemplate } from './app-menu-template';
import {
  atGatewayDetail,
  atHome,
  atProviders,
  atUsage,
  everyPlatform,
  idleHandlers,
  itemAccelerator,
  itemEnabled,
  itemLabelled,
  menuLabelled,
  recordingHandlers,
  shapeOf,
} from './app-menu-template.testkit';

function tickOf(template: ReturnType<typeof buildAppMenuTemplate>, label: string) {
  return itemLabelled(template, label)?.checked;
}

describe('walking the app from the View menu', () => {
  test('the navigation items print the plain numbers in order, on every platform', () => {
    for (const platform of everyPlatform) {
      const template = buildAppMenuTemplate(platform, idleHandlers, atHome);

      expect(itemAccelerator(template, 'Gateways')).toBe('CmdOrCtrl+1');
      expect(itemAccelerator(template, 'Providers')).toBe('CmdOrCtrl+2');
      expect(itemAccelerator(template, 'Usage')).toBe('CmdOrCtrl+3');
    }
  });

  test('a pick reaches its own surface seam', () => {
    const taken: string[] = [];
    const template = buildAppMenuTemplate('darwin', recordingHandlers(taken), atHome);

    for (const label of ['Gateways', 'Providers', 'Usage']) {
      itemLabelled(template, label)?.click?.();
    }

    expect(taken).toEqual(['open-gateways', 'open-providers', 'open-usage']);
  });

  test('the navigation rows tick the standing surface as one radio group', () => {
    const home = buildAppMenuTemplate('darwin', idleHandlers, atHome);
    const providers = buildAppMenuTemplate('darwin', idleHandlers, atProviders);
    const usage = buildAppMenuTemplate('darwin', idleHandlers, atUsage);
    const detail = buildAppMenuTemplate('darwin', idleHandlers, atGatewayDetail);

    expect(itemLabelled(home, 'Gateways')?.type).toBe('radio');
    expect(tickOf(home, 'Gateways')).toBe(true);
    expect(tickOf(providers, 'Providers')).toBe(true);
    expect(tickOf(providers, 'Gateways')).toBe(false);
    expect(tickOf(usage, 'Usage')).toBe(true);
    expect(tickOf(detail, 'Gateways')).toBe(true);
  });

  test('a pick stays available with no window standing, because it opens one', () => {
    const template = buildAppMenuTemplate('darwin', idleHandlers, {
      ...atHome,
      windowStanding: false,
    });

    expect(itemEnabled(template, 'Gateways')).toBe(true);
    expect(itemEnabled(template, 'Providers')).toBe(true);
    expect(itemEnabled(template, 'Usage')).toBe(true);
  });
});

describe('the checklist toggle lives under View alone', () => {
  test('every platform carries it under View, and no other menu carries it', () => {
    for (const platform of everyPlatform) {
      const template = buildAppMenuTemplate(platform, idleHandlers, atHome);
      const view = menuLabelled(template, 'View');

      expect(itemLabelled(view?.submenu ?? [], 'Show Onboarding Checklist')).toBeDefined();
      expect(
        template
          .filter((menu) => menu !== view)
          .flatMap((menu) => menu.submenu ?? [])
          .some((item) => item.label === 'Show Onboarding Checklist'),
      ).toBe(false);
    }
  });
});

describe('the surface toggles under View', () => {
  test('the sidebar and inspector toggles print their chords', () => {
    const template = buildAppMenuTemplate('darwin', idleHandlers, atGatewayDetail);

    expect(itemAccelerator(template, 'Show Sidebar')).toBe('CmdOrCtrl+B');
    expect(itemAccelerator(template, 'Show Inspector')).toBe('Alt+CmdOrCtrl+B');
  });

  test('each tick reads the reported state, never the last push', () => {
    const shown = buildAppMenuTemplate('darwin', idleHandlers, {
      ...atGatewayDetail,
      sidebarShown: false,
      inspectorOpen: true,
    });

    expect(itemLabelled(shown, 'Show Sidebar')?.checked).toBe(false);
    expect(itemLabelled(shown, 'Show Inspector')?.checked).toBe(true);
  });

  test('a toggle pick pushes its view command', () => {
    const taken: string[] = [];
    const template = buildAppMenuTemplate('darwin', recordingHandlers(taken), atGatewayDetail);

    itemLabelled(template, 'Show Sidebar')?.click?.();
    itemLabelled(template, 'Show Inspector')?.click?.();

    expect(taken).toEqual(['toggle-sidebar', 'toggle-inspector']);
  });

  test('the inspector item dims off the canvas rather than disappearing', () => {
    const template = buildAppMenuTemplate('darwin', idleHandlers, atProviders);

    expect(itemEnabled(template, 'Show Inspector')).toBe(false);
    expect(itemEnabled(template, 'Show Sidebar')).toBe(true);
  });
});

describe('the toggles with no window standing', () => {
  test('both dim and their ticks clear, because no surface answers', () => {
    const template = buildAppMenuTemplate('darwin', idleHandlers, {
      ...atGatewayDetail,
      windowStanding: false,
    });

    expect(itemEnabled(template, 'Show Sidebar')).toBe(false);
    expect(itemEnabled(template, 'Show Inspector')).toBe(false);
    expect(tickOf(template, 'Show Sidebar')).toBe(false);
    expect(tickOf(template, 'Show Inspector')).toBe(false);
  });
});

describe('the View menu order', () => {
  test('navigation leads, the toggles and checklist follow, the reload rows, then full screen', () => {
    const view = menuLabelled(buildAppMenuTemplate('darwin', idleHandlers, atHome), 'View');

    expect(shapeOf(view?.submenu ?? [])).toEqual([
      'Gateways',
      'Providers',
      'Usage',
      'separator',
      'Show Sidebar',
      'Show Inspector',
      'Show Onboarding Checklist',
      'separator',
      'reload',
      'forceReload',
      'toggleDevTools',
      'separator',
      'togglefullscreen',
    ]);
  });

  test('a packaged run drops Force Reload and Toggle DevTools, and keeps the reload row', () => {
    const view = menuLabelled(
      buildAppMenuTemplate('darwin', idleHandlers, { ...atHome, development: false }),
      'View',
    );

    expect(shapeOf(view?.submenu ?? [])).toEqual([
      'Gateways',
      'Providers',
      'Usage',
      'separator',
      'Show Sidebar',
      'Show Inspector',
      'Show Onboarding Checklist',
      'separator',
      'reload',
      'separator',
      'togglefullscreen',
    ]);
  });
});
