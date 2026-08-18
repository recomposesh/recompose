import { describe, expect, it } from 'vitest';

import { downloadHref, downloadTargets, releaseAssetUrl } from './download-targets';

describe('the permanent download contract on recompose.sh', () => {
  it('names exactly the five published targets', () => {
    expect(downloadTargets).toStrictEqual([
      'mac-arm64',
      'mac-x64',
      'windows',
      'linux-appimage',
      'linux-deb',
    ]);
  });

  it('links every target under /download, never at an asset', () => {
    expect(downloadHref['mac-arm64']).toBe('/download/mac-arm64');
    expect(downloadHref['mac-x64']).toBe('/download/mac-x64');
    expect(downloadHref.windows).toBe('/download/windows');
    expect(downloadHref['linux-appimage']).toBe('/download/linux-appimage');
    expect(downloadHref['linux-deb']).toBe('/download/linux-deb');
  });
});

describe('a versioned release asset address', () => {
  it('builds the per-architecture disk image names', () => {
    expect(releaseAssetUrl('0.3.0', 'mac-arm64')).toBe(
      'https://github.com/recomposesh/recompose/releases/download/v0.3.0/Recompose-0.3.0-arm64.dmg',
    );
    expect(releaseAssetUrl('0.3.0', 'mac-x64')).toBe(
      'https://github.com/recomposesh/recompose/releases/download/v0.3.0/Recompose-0.3.0-x64.dmg',
    );
  });

  it('builds the Windows installer name', () => {
    expect(releaseAssetUrl('0.3.0', 'windows')).toBe(
      'https://github.com/recomposesh/recompose/releases/download/v0.3.0/Recompose-0.3.0-setup.exe',
    );
  });

  it('builds the Linux names, underscores and amd64 for the deb', () => {
    expect(releaseAssetUrl('0.3.0', 'linux-appimage')).toBe(
      'https://github.com/recomposesh/recompose/releases/download/v0.3.0/Recompose-0.3.0.AppImage',
    );
    expect(releaseAssetUrl('0.3.0', 'linux-deb')).toBe(
      'https://github.com/recomposesh/recompose/releases/download/v0.3.0/Recompose_0.3.0_amd64.deb',
    );
  });
});
