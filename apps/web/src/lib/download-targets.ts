import { gitHubUrl } from './links';

export const brewInstallCommand = 'brew install --cask recomposesh/tap/recompose';

export const downloadTargets = [
  'mac-arm64',
  'mac-x64',
  'windows',
  'linux-appimage',
  'linux-deb',
] as const;

export type DownloadTarget = (typeof downloadTargets)[number];

export const downloadHref: Record<DownloadTarget, string> = {
  'mac-arm64': '/download/mac-arm64',
  'mac-x64': '/download/mac-x64',
  windows: '/download/windows',
  'linux-appimage': '/download/linux-appimage',
  'linux-deb': '/download/linux-deb',
};

const assetName: Record<DownloadTarget, (version: string) => string> = {
  'mac-arm64': (version) => `Recompose-${version}-arm64.dmg`,
  'mac-x64': (version) => `Recompose-${version}-x64.dmg`,
  windows: (version) => `Recompose-${version}-setup.exe`,
  'linux-appimage': (version) => `Recompose-${version}.AppImage`,
  'linux-deb': (version) => `Recompose_${version}_amd64.deb`,
};

export function releaseAssetUrl(version: string, target: DownloadTarget): string {
  return `${gitHubUrl}/releases/download/v${version}/${assetName[target](version)}`;
}
