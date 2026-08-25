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

/** Whether the named item renders available, or nothing where no item carries the label. */
export function itemEnabled(template: AppMenuItem[], label: string): boolean | undefined {
  const item = itemLabelled(template, label);

  return item === undefined ? undefined : (item.enabled ?? true);
}

/** The chord the named item prints, or nothing where it prints none. */
export function itemAccelerator(template: AppMenuItem[], label: string): string | undefined {
  return itemLabelled(template, label)?.accelerator;
}

function onboardingHandlers(
  taken: string[],
): Pick<AppMenuHandlers, 'onOpenSetup' | 'onToggleChecklist'> {
  return {
    onOpenSetup: () => {
      taken.push('open-setup');
    },
    onToggleChecklist: (shown) => {
      taken.push(`show-checklist ${String(shown)}`);
    },
  };
}

export function recordingHandlers(taken: string[]): AppMenuHandlers {
  return {
    ...onboardingHandlers(taken),
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
    onViewCommand: (command) => {
      taken.push(command);
    },
    onOpenGateways: () => {
      taken.push('open-gateways');
    },
    onOpenProviders: () => {
      taken.push('open-providers');
    },
    onOpenUsage: () => {
      taken.push('open-usage');
    },
    onStartGateway: (slug) => {
      taken.push(`start ${slug}`);
    },
    onStopGateway: (slug) => {
      taken.push(`stop ${slug}`);
    },
    onRestartGateway: (slug) => {
      taken.push(`restart ${slug}`);
    },
    onOpenHelpSite: () => {
      taken.push('help-site');
    },
    onOpenConfigFolder: () => {
      taken.push('config-folder');
    },
    onReportIssue: () => {
      taken.push('report-issue');
    },
  };
}

export const idleHandlers = recordingHandlers([]);

export const atHome: AppMenuView = {
  checklistShown: true,
  setupStanding: false,
  onGatewayDetail: false,
  onProviders: false,
  onUsage: false,
  logsDrawerOpen: false,
  usageTableOpen: false,
  sidebarShown: true,
  inspectorOpen: false,
  modalStanding: false,
  windowStanding: true,
  standingGatewaySlug: null,
  gatewayServing: false,
  usageRange: '24h',
  usageMetric: 'requests',
  usageRetentionDays: 30,
  development: true,
};

export const atGatewayDetail: AppMenuView = {
  ...atHome,
  onGatewayDetail: true,
  standingGatewaySlug: 'personal',
};

export const atUsage: AppMenuView = {
  ...atHome,
  onUsage: true,
};

export const atProviders: AppMenuView = {
  ...atHome,
  onProviders: true,
};

export const everyPlatform: NodeJS.Platform[] = ['darwin', 'win32', 'linux'];
