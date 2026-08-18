import type { ComponentType } from 'react';

import type { Platform } from '../lib/detect-platform';

import { LinuxButtons } from './linux-buttons';
import { MacButtons } from './mac-buttons';
import { WindowsButtons } from './windows-buttons';

const buttons: Record<Platform, ComponentType> = {
  mac: MacButtons,
  windows: WindowsButtons,
  linux: LinuxButtons,
};

const requirements: Record<Platform, string> = {
  mac: 'macOS 12 Monterey or later',
  windows: 'Windows 10 or later, 64-bit · unsigned for now — SmartScreen may warn',
  linux: 'any modern 64-bit distro · the AppImage updates itself',
};

export function PrimaryDownload({ platform }: { platform: Platform }) {
  const Buttons = buttons[platform];

  return (
    <div className="flex flex-col items-center">
      <Buttons />
      <p className="mt-4 text-control text-stage-faint">{requirements[platform]}</p>
    </div>
  );
}
