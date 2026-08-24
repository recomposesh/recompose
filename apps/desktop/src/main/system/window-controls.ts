import type { WindowControls } from '@recompose/contracts';

export function windowControlsFor(platform: NodeJS.Platform): WindowControls {
  if (platform === 'darwin') {
    return 'leading';
  }

  return platform === 'win32' ? 'trailing' : 'none';
}
