import type { Settings } from '@recompose/contracts';

import type { AppMenuConduct } from './app-menu-conductor';

import { pushCanvasCommand, pushUsageCommand } from '../ipc/push-events';
import { conductAppMenu } from './app-menu-conductor';

type AppMenuBootSeams = {
  onOpenSettings: () => void;
  onNewGateway: () => void;
  settingsFile: () => string;
  onCorrupt: (quarantinedPath: string) => void;
  pushSettings: (settings: Settings) => void;
};

/** The app menu conducted over the window pushes, which is the only way a menu command travels. */
export function bootAppMenu(seams: AppMenuBootSeams): AppMenuConduct {
  return conductAppMenu({
    ...seams,
    onCanvasCommand: pushCanvasCommand,
    onUsageCommand: pushUsageCommand,
  });
}
