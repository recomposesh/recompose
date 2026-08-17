import { fc, test as propertyTest } from '@fast-check/vitest';
import { describe, expect, test } from 'vitest';

import { updateChannelFor } from './update-channel';

const anyPlatform = fc.constantFrom<NodeJS.Platform>('darwin', 'linux', 'win32', 'freebsd');

const anyEnv = fc.record(
  { APPIMAGE: fc.constantFrom('/opt/Recompose-0.3.0.AppImage', '') },
  { requiredKeys: [] },
);

describe('who owns an update, row by row', () => {
  test('an unpackaged run belongs to nobody', () => {
    expect(updateChannelFor('darwin', {}, false, true)).toBe('none');
    expect(updateChannelFor('linux', { APPIMAGE: '/opt/a.AppImage' }, false, true)).toBe('none');
  });

  test('a macOS copy in the Applications folder updates itself', () => {
    expect(updateChannelFor('darwin', {}, true, true)).toBe('self');
  });

  test('a macOS copy outside the Applications folder belongs to nobody', () => {
    expect(updateChannelFor('darwin', {}, true, false)).toBe('none');
  });

  test('an AppImage updates itself', () => {
    expect(updateChannelFor('linux', { APPIMAGE: '/opt/a.AppImage' }, true, true)).toBe('self');
  });

  test('a Linux install without the AppImage marker belongs to the package tool', () => {
    expect(updateChannelFor('linux', {}, true, true)).toBe('package-tool');
    expect(updateChannelFor('linux', { APPIMAGE: '' }, true, true)).toBe('package-tool');
  });

  test('a Windows install belongs to nobody in this slice', () => {
    expect(updateChannelFor('win32', {}, true, true)).toBe('none');
  });

  test('a platform the app never shipped to belongs to nobody', () => {
    expect(updateChannelFor('freebsd', {}, true, true)).toBe('none');
  });
});

describe('the laws, pinned with fixed values', () => {
  test('packaging gates everything: the same inputs unpackaged answer none', () => {
    expect(updateChannelFor('darwin', {}, false, true)).toBe('none');
    expect(updateChannelFor('linux', { APPIMAGE: '/opt/a.AppImage' }, false, true)).toBe('none');
    expect(updateChannelFor('win32', {}, false, true)).toBe('none');
  });

  test('the Applications folder matters only on macOS', () => {
    expect(updateChannelFor('linux', { APPIMAGE: '/opt/a.AppImage' }, true, false)).toBe(
      updateChannelFor('linux', { APPIMAGE: '/opt/a.AppImage' }, true, true),
    );
    expect(updateChannelFor('win32', {}, true, false)).toBe(
      updateChannelFor('win32', {}, true, true),
    );
  });
});

propertyTest.prop([anyPlatform, anyEnv, fc.boolean()])(
  'an unpackaged run answers none whatever else holds',
  (platform, env, inApplicationsFolder) => {
    expect(updateChannelFor(platform, env, false, inApplicationsFolder)).toBe('none');
  },
);

propertyTest.prop([
  fc.constantFrom<NodeJS.Platform>('linux', 'win32', 'freebsd'),
  anyEnv,
  fc.boolean(),
])('outside macOS the Applications folder changes nothing', (platform, env, isPackaged) => {
  expect(updateChannelFor(platform, env, isPackaged, false)).toBe(
    updateChannelFor(platform, env, isPackaged, true),
  );
});
