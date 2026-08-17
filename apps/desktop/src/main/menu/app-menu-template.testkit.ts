import type { AppMenuHandlers, AppMenuItem, AppMenuView } from './app-menu-template';

function everyItem(template: AppMenuItem[]): AppMenuItem[] {
  return template.flatMap((item) => [item, ...everyItem(item.submenu ?? [])]);
}

export function itemLabelled(template: AppMenuItem[], label: string): AppMenuItem | undefined {
  return everyItem(template).find((item) => item.label === label);
}

export function menuLabelled(template: AppMenuItem[], label: string): AppMenuItem | undefined {
  return template.find((item) => item.label === label);
}

export function shapeOf(items: AppMenuItem[]): (string | undefined)[] {
  return items.map((item) => item.role ?? item.label ?? item.type);
}

export function recordingHandlers(taken: string[]): AppMenuHandlers {
  return {
    onOpenSettings: () => {
      taken.push('open-settings');
    },
    onNewGateway: () => {
      taken.push('new-gateway');
    },
    onToggleChecklist: (shown) => {
      taken.push(`show-checklist ${String(shown)}`);
    },
    onCanvasCommand: (command) => {
      taken.push(command);
    },
    onUsageCommand: (command) => {
      taken.push(command);
    },
  };
}

export const idleHandlers = recordingHandlers([]);

export const atHome: AppMenuView = {
  checklistShown: true,
  onGatewayDetail: false,
  logsDrawerOpen: false,
  onUsage: false,
  usageTableOpen: false,
  sidebarShown: true,
  inspectorOpen: false,
  modalStanding: false,
};

export const atGatewayDetail: AppMenuView = {
  checklistShown: true,
  onGatewayDetail: true,
  logsDrawerOpen: false,
  onUsage: false,
  usageTableOpen: false,
  sidebarShown: true,
  inspectorOpen: false,
  modalStanding: false,
};

export const atUsage: AppMenuView = {
  checklistShown: true,
  onGatewayDetail: false,
  logsDrawerOpen: false,
  onUsage: true,
  usageTableOpen: false,
  sidebarShown: true,
  inspectorOpen: false,
  modalStanding: false,
};

export const everyPlatform: NodeJS.Platform[] = ['darwin', 'win32', 'linux'];
