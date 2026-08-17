import type { IpcEventPayload } from '@recompose/contracts';
import type { MenuItemConstructorOptions } from 'electron';

export type AppMenuItem = {
  label?: string;
  role?: NonNullable<MenuItemConstructorOptions['role']>;
  accelerator?: string;
  type?: 'separator' | 'checkbox';
  checked?: boolean;
  click?: () => void;
  submenu?: AppMenuItem[];
};

export type AppMenuHandlers = {
  onOpenSettings: () => void;
  onNewGateway: () => void;
  onToggleChecklist: (shown: boolean) => void;
  onCanvasCommand: (command: IpcEventPayload<'canvas:command'>) => void;
  onUsageCommand: (command: IpcEventPayload<'usage:command'>) => void;
};

export type AppMenuView = {
  checklistShown: boolean;
  onGatewayDetail: boolean;
  logsDrawerOpen: boolean;
  onUsage: boolean;
  usageTableOpen: boolean;
  sidebarShown: boolean;
  inspectorOpen: boolean;
  modalStanding: boolean;
};
