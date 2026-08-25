import type { Settings } from '@recompose/contracts';

import { shell } from 'electron';

import type { AppMenuConduct } from './app-menu-conductor';

import { pushCanvasCommand, pushUsageCommand, pushViewCommand } from '../ipc/push-events';
import { conductAppMenu } from './app-menu-conductor';
import { HELP_SITE_URL, NEW_ISSUE_URL } from './help-links';

type AppMenuBootSeams = {
  onOpenSettings: () => void;
  onNewGateway: () => void;
  onOpenGateways: () => void;
  onOpenProviders: () => void;
  onOpenUsage: () => void;
  lifecycle: {
    start: (slug: string) => void;
    stop: (slug: string) => void;
    restart: (slug: string) => void;
  };
  configFolder: () => string;
  development: boolean;
  settingsFile: () => string;
  onCorrupt: (quarantinedPath: string) => void;
  pushSettings: (settings: Settings) => void;
};

function openedExternally(address: string): () => void {
  return () => {
    shell.openExternal(address).catch((error: unknown) => {
      console.error(`recompose could not open ${address} in the browser`, error);
    });
  };
}

function openedConfigFolder(configFolder: () => string): () => void {
  return () => {
    void shell.openPath(configFolder()).then((failure) => {
      if (failure !== '') {
        console.error(`recompose could not open the config folder: ${failure}`);
      }
    });
  };
}

/** The app menu conducted over the window pushes, which is the only way a menu command travels. */
export function bootAppMenu(seams: AppMenuBootSeams): AppMenuConduct {
  return conductAppMenu({
    onOpenSettings: seams.onOpenSettings,
    onNewGateway: seams.onNewGateway,
    onOpenGateways: seams.onOpenGateways,
    onOpenProviders: seams.onOpenProviders,
    onOpenUsage: seams.onOpenUsage,
    onCanvasCommand: pushCanvasCommand,
    onUsageCommand: pushUsageCommand,
    onViewCommand: pushViewCommand,
    onOpenSetup: () => {
      pushViewCommand('open-setup');
    },
    onStartGateway: seams.lifecycle.start,
    onStopGateway: seams.lifecycle.stop,
    onRestartGateway: seams.lifecycle.restart,
    onOpenHelpSite: openedExternally(HELP_SITE_URL),
    onOpenConfigFolder: openedConfigFolder(seams.configFolder),
    onReportIssue: openedExternally(NEW_ISSUE_URL),
    development: seams.development,
    settingsFile: seams.settingsFile,
    onCorrupt: seams.onCorrupt,
    pushSettings: seams.pushSettings,
  });
}
