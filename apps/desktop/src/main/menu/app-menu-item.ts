import type { IpcEventPayload, UsageSearchRange } from '@recompose/contracts';
import type { MenuItemConstructorOptions } from 'electron';

/**
 * @summary No item anywhere sets `visible: false`, because a hidden item's accelerator can still
 * fire on macOS while an unavailable one can't; `enabled` is the one honest way to disarm.
 */
export type AppMenuItem = {
  label?: string;
  role?: NonNullable<MenuItemConstructorOptions['role']>;
  accelerator?: string;
  type?: 'separator' | 'checkbox' | 'radio';
  checked?: boolean;
  enabled?: boolean;
  click?: () => void;
  submenu?: AppMenuItem[];
};

export type AppMenuHandlers = {
  onOpenSettings: () => void;
  onNewGateway: () => void;
  onToggleChecklist: (shown: boolean) => void;
  /** Opens the setup wizard again on a profile that already settled it. */
  onOpenSetup: () => void;
  onCanvasCommand: (command: IpcEventPayload<'canvas:command'>) => void;
  onUsageCommand: (command: IpcEventPayload<'usage:command'>) => void;
  onViewCommand: (command: IpcEventPayload<'view:command'>) => void;
  onOpenGateways: () => void;
  onOpenProviders: () => void;
  onOpenUsage: () => void;
  onStartGateway: (slug: string) => void;
  onStopGateway: (slug: string) => void;
  onRestartGateway: (slug: string) => void;
  onOpenHelpSite: () => void;
  onOpenConfigFolder: () => void;
  onReportIssue: () => void;
};

/** The words the Usage metric radio speaks, one per series the chart draws. */
export type UsageMetricWord =
  Extract<IpcEventPayload<'usage:command'>, `metric-${string}`> extends `metric-${infer Metric}`
    ? Metric
    : never;

export type AppMenuView = {
  checklistShown: boolean;
  /** Whether the setup wizard stands over the window right now. */
  setupStanding: boolean;
  onGatewayDetail: boolean;
  onProviders: boolean;
  onUsage: boolean;
  logsDrawerOpen: boolean;
  usageTableOpen: boolean;
  sidebarShown: boolean;
  inspectorOpen: boolean;
  modalStanding: boolean;
  windowStanding: boolean;
  standingGatewaySlug: string | null;
  gatewayServing: boolean;
  usageRange: UsageSearchRange;
  usageMetric: UsageMetricWord;
  usageRetentionDays: number;
  development: boolean;
};
