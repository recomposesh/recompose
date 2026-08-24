import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import { windowOptionsFor } from './window-options';

const somePreload = '/app/preload/index.js';
const someIcon = '/app/resources/icon.png';

const anyPlatform = fc.constantFrom<NodeJS.Platform>(
  'aix',
  'android',
  'cygwin',
  'darwin',
  'freebsd',
  'haiku',
  'linux',
  'netbsd',
  'openbsd',
  'sunos',
  'win32',
);

describe('window chrome per platform', () => {
  test('macOS gets transparent glass chrome with inset traffic lights', () => {
    const options = windowOptionsFor('darwin', somePreload, someIcon, 'light');

    expect(options.transparent).toBe(true);
    expect(options.titleBarStyle).toBe('hidden');
    expect(options.trafficLightPosition).toEqual({ x: 14, y: 12 });
    expect(options.icon).toBeUndefined();
  });

  test('Linux gets the app icon and default chrome', () => {
    const options = windowOptionsFor('linux', somePreload, someIcon, 'light');

    expect(options.icon).toBe(someIcon);
    expect(options.transparent).toBeUndefined();
    expect(options.titleBarStyle).toBeUndefined();
  });

  test('Windows gets a hidden title bar with the caption strip painted over the renderer', () => {
    const options = windowOptionsFor('win32', somePreload, someIcon, 'light');

    expect(options.titleBarStyle).toBe('hidden');
    expect(options.titleBarOverlay).toEqual({
      color: '#f4f4f6',
      symbolColor: '#1c1c1e',
      height: 54,
    });
    expect(options.transparent).toBeUndefined();
    expect(options.icon).toBeUndefined();
  });

  test('a Windows window opened dark wears the dark caption strip', () => {
    const options = windowOptionsFor('win32', somePreload, someIcon, 'dark');

    expect(options.titleBarOverlay).toEqual({
      color: '#28282c',
      symbolColor: '#f9f9fb',
      height: 54,
    });
  });

  test('the scheme moves nothing on the platforms that paint no caption strip', () => {
    expect(windowOptionsFor('darwin', somePreload, someIcon, 'dark')).toEqual(
      windowOptionsFor('darwin', somePreload, someIcon, 'light'),
    );
    expect(windowOptionsFor('linux', somePreload, someIcon, 'dark')).toEqual(
      windowOptionsFor('linux', somePreload, someIcon, 'light'),
    );
  });
});

describe('what every window promises before it shows', () => {
  test('it stays hidden until the renderer paints, and reaches the preload sandboxed', () => {
    const options = windowOptionsFor('darwin', somePreload, someIcon, 'light');

    expect(options.show).toBe(false);
    expect(options.autoHideMenuBar).toBe(true);
    expect(options.webPreferences?.preload).toBe(somePreload);
    expect(options.webPreferences?.sandbox).toBe(true);
  });
});

describe('window chrome contract across all platforms', () => {
  test.prop([anyPlatform])(
    'every platform gets the same hidden-until-ready frame wired to the preload',
    (platform) => {
      const options = windowOptionsFor(platform, somePreload, someIcon, 'light');

      expect(options.width).toBe(1120);
      expect(options.height).toBe(780);
      expect(options.show).toBe(false);
      expect(options.autoHideMenuBar).toBe(true);
      expect(options.webPreferences?.preload).toBe(somePreload);
      expect(options.webPreferences?.sandbox).toBe(true);
    },
  );

  test.prop([anyPlatform])(
    'every platform gets a floor, below which the settings column tears',
    (platform) => {
      const options = windowOptionsFor(platform, somePreload, someIcon, 'light');

      expect(options.minWidth).toBe(720);
      expect(options.minHeight).toBe(500);
    },
  );

  test.prop([anyPlatform])(
    'only macOS gets glass chrome, only Windows gets a caption strip, only Linux gets the icon',
    (platform) => {
      const options = windowOptionsFor(platform, somePreload, someIcon, 'light');
      const hidesItsTitleBar = platform === 'darwin' || platform === 'win32';

      expect(options.transparent).toBe(platform === 'darwin' ? true : undefined);
      expect(options.titleBarStyle).toBe(hidesItsTitleBar ? 'hidden' : undefined);
      expect(options.titleBarOverlay === undefined).toBe(platform !== 'win32');
      expect(options.icon).toBe(platform === 'linux' ? someIcon : undefined);
    },
  );
});
