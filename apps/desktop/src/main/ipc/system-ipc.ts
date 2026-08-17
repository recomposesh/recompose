import type { IpcRequest, SystemState } from '@recompose/contracts';

import type { FileBrowser } from '../system/file-browser';
import type { LoginItemAvailability } from '../system/login-item';
import type { IpcHandlers } from './dispatch';

import { homeRelative } from '../system/home-relative';
import { windowButtonsFor } from '../windows/window-buttons';
import { ipcFailure } from './storage-envelope';

export type SystemIpcContext = {
  fileBrowser: FileBrowser;
  loginItem: LoginItemAvailability;
  configFolder: string;
  homeFolder: string;
  readLoginItem: () => boolean;
  isMenuBarVisible: () => boolean;
  openFolder: (path: string) => Promise<string>;
  /** Moves the window controls to the band they now sit over. */
  placeWindowButtons: (position: { x: number; y: number }) => void;
  /** Does what the person set a title-bar double-click to do, to the window they double-clicked. */
  answerTitleBarDoubleClick: () => void;
  /** Carries whether the logs drawer stands open, which only the renderer knows, to the menu tick. */
  noteLogsDrawer: (open: boolean) => void;
  /** Carries the one surface snapshot, sidebar, inspector, and modal, to the menu ticks. */
  noteSurfaceToggles: (toggles: IpcRequest<'system:surface-toggles'>) => void;
};

export type SystemIpcHandlers = Pick<
  IpcHandlers,
  | 'system:get'
  | 'system:open-config-folder'
  | 'system:window-band'
  | 'system:title-bar-double-click'
  | 'system:logs-drawer'
  | 'system:surface-toggles'
>;

function observeSystem(ctx: SystemIpcContext): SystemState {
  return {
    fileBrowser: ctx.fileBrowser,
    loginItem: ctx.loginItem,
    loginItemEnabled: ctx.readLoginItem(),
    menuBarVisible: ctx.isMenuBarVisible(),
    configFolder: homeRelative(ctx.configFolder, ctx.homeFolder),
  };
}

async function openConfigFolder(ctx: SystemIpcContext) {
  const failure = await ctx.openFolder(ctx.configFolder);

  if (failure !== '') {
    return ipcFailure('folder-open-failed', `could not open the config folder: ${failure}`);
  }

  return { ok: true as const, value: undefined };
}

function placedWindowButtons(ctx: SystemIpcContext, band: 'sidebar' | 'toolbar') {
  ctx.placeWindowButtons(windowButtonsFor(band));

  return { ok: true as const, value: undefined };
}

export function createSystemIpcHandlers(ctx: SystemIpcContext): SystemIpcHandlers {
  return {
    'system:get': async () => Promise.resolve({ ok: true as const, value: observeSystem(ctx) }),
    'system:open-config-folder': async () => openConfigFolder(ctx),
    'system:window-band': async (band) => Promise.resolve(placedWindowButtons(ctx, band)),
    'system:title-bar-double-click': async () => {
      ctx.answerTitleBarDoubleClick();

      return Promise.resolve({ ok: true as const, value: undefined });
    },
    'system:logs-drawer': async ({ open }) => {
      ctx.noteLogsDrawer(open);

      return Promise.resolve({ ok: true as const, value: undefined });
    },
    'system:surface-toggles': async (toggles) => {
      ctx.noteSurfaceToggles(toggles);

      return Promise.resolve({ ok: true as const, value: undefined });
    },
  };
}
