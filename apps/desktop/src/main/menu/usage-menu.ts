import type { IpcEventPayload, UsageSearchRange } from '@recompose/contracts';

import { usageSearchRangeSchema } from '@recompose/contracts';

import type { AppMenuHandlers, AppMenuItem, AppMenuView, UsageMetricWord } from './app-menu-item';

/**
 * The menu's own title-case words for each range, beside the popover's sentence case.
 *
 * @summary Every surface keeps its own label for a range; the totality of this table is what pins
 * the menu to the contract vocabulary, so a range added to the address arrives here as a red
 * build.
 */
const RANGE_MENU_LABELS: Record<UsageSearchRange, string> = {
  '1h': 'Last Hour',
  '24h': 'Last 24 Hours',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  'this-week': 'This Week',
  'this-month': 'This Month',
  custom: 'Custom Range…',
};

const METRIC_MENU_LABELS: Record<UsageMetricWord, string> = {
  requests: 'Requests',
  latency: 'Latency',
  tokens: 'Tokens',
  spend: 'Spend',
};

function usageCommandClick(
  handlers: AppMenuHandlers,
  command: IpcEventPayload<'usage:command'>,
): () => void {
  return () => {
    handlers.onUsageCommand(command);
  };
}

function rangeAvailable(range: UsageSearchRange, retentionDays: number): boolean {
  return !(range === '30d' && retentionDays < 30);
}

function rangeItem(
  handlers: AppMenuHandlers,
  view: AppMenuView,
  range: UsageSearchRange,
  digit: number,
): AppMenuItem {
  return {
    label: RANGE_MENU_LABELS[range],
    ...(range === 'custom' ? {} : { accelerator: `Alt+CmdOrCtrl+${String(digit)}` }),
    type: 'radio',
    checked: view.usageRange === range,
    enabled: rangeAvailable(range, view.usageRetentionDays),
    click: usageCommandClick(handlers, `range-${range}`),
  };
}

function rangeItems(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem[] {
  return usageSearchRangeSchema.options.map((range, seat) =>
    rangeItem(handlers, view, range, seat + 1),
  );
}

function metricSubmenu(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem {
  const metrics: readonly UsageMetricWord[] = ['requests', 'latency', 'tokens', 'spend'];

  return {
    label: 'Metric',
    submenu: metrics.map((metric) => ({
      label: METRIC_MENU_LABELS[metric],
      type: 'radio',
      checked: view.usageMetric === metric,
      click: usageCommandClick(handlers, `metric-${metric}`),
    })),
  };
}

export function usageMenu(handlers: AppMenuHandlers, view: AppMenuView): AppMenuItem {
  return {
    label: 'Usage',
    enabled: !view.modalStanding,
    submenu: [
      ...rangeItems(handlers, view),
      { type: 'separator' },
      metricSubmenu(handlers, view),
      { type: 'separator' },
      {
        label: 'Show Data Table',
        accelerator: 'CmdOrCtrl+Shift+T',
        type: 'checkbox',
        checked: view.usageTableOpen,
        click: usageCommandClick(handlers, 'toggle-table-twin'),
      },
      { type: 'separator' },
      {
        label: 'Refresh Usage',
        accelerator: 'Alt+CmdOrCtrl+R',
        click: usageCommandClick(handlers, 'refresh'),
      },
    ],
  };
}
